require('babel-polyfill');
const MailAdapter = require('parse-server/lib/Adapters/Email/MailAdapter');
const nodemailer = require("nodemailer");
const mailcomposer = require('mailcomposer');
const _template = require('lodash.template');
const co = require('co');
const fs = require('fs');
const path = require('path');
var transporter;

/**
 * MailAdapter implementation used by the Parse Server to send
 * password reset and email verification emails though SMTP
 * @class
 */
class AnotherSmtpAdapter extends MailAdapter.default {
    constructor(options = {}) {
        super(options);
        if (!options ||!options.password || !options.host || !options.fromAddress) {
            throw 'AnotherSmtpAdapter requires password, host, and fromAddress';
        }

        const {templates = {}} = options;
        for (let name in templates) {
            const {subject, pathPlainText, callback} = templates[name] || {};

            if (typeof subject !== 'string' || typeof pathPlainText !== 'string') {
                throw new Error('AnotherSmtpAdapter templates are not properly configured.');
            }

            if (callback && typeof callback !== 'function') {
                throw new Error('AnotherSmtpAdapter template callback is not a function.');
            }
        }

        transporter = nodemailer.createTransport({
            host: options.host,
            port: options.port,
            secure: options.isSSL,
            auth: {
                user: options.user,
                pass: options.password
            }
        });
        this.fromAddress = fromAddress;
        this.templates = templates;
        this.cache = {};
    }

    /**
     * Method to send MIME emails via SMTP
     * @param {Object} options
     * @returns {Promise}
     */
    _sendMail(options) {
        const self = this;
        let message = {},
            template,
            templateVars = {},
            templateName = options.templateName;

        if (!templateName) {
            throw new Error('Invalid options object: missing templateName');
        }

        template = this.templates[templateName];

        if (!template) {
            throw new Error(`Could not find template with name ${templateName}`);
        }

        // The adapter is used directly by the user's code instead via Parse Server
        if (options.direct) {
            const {subject, fromAddress, recipient, variables} = options;

            if (!subject && !template.subject) {
                throw new Error(`Cannot send email with template ${templateName} without a subject`);
            }
            if (!recipient) {
                throw new Error(`Cannot send email with template ${templateName} without a recipient`);
            }

            templateVars = variables;
            message = {
                from: fromAddress || this.fromAddress,
                to: recipient,
                subject: subject || template.subject
            };
        } else {
            const {link, appName, user} = options;
            const {callback} = template;
            let userVars;

            if (callback && typeof callback === 'function') {
                userVars = callback(user);
                // If custom user variables are not packaged in an object, ignore it
                const validUserVars = userVars && userVars.constructor && userVars.constructor.name === 'Object';
                userVars = validUserVars ? userVars : {};
            }

            templateVars = Object.assign({
                link,
                appName,
                username: user.get('username'),
                email: user.get('email')
            }, userVars);

            message = {
                from: this.fromAddress,
                to: user.get('email'),
                subject: template.subject
            };
        }

        return co(function*() {
            let compiled;
            let pathPlainText = template.pathPlainText;
            let pathHtml = template.pathHtml;
            let cachedTemplate = self.cache[templateName] = self.cache[templateName] || {};

            // Load plain-text version
            if (!cachedTemplate['text']) {
                let plainTextEmail = yield self.loadEmailTemplate(pathPlainText);
                plainTextEmail = plainTextEmail.toString('utf8');
                cachedTemplate['text'] = plainTextEmail;
            }

            // Compile plain-text template
            compiled = _template(cachedTemplate['text'], {interpolate: /{{([\s\S]+?)}}/g});
            // Add processed text to the message object
            message.text = compiled(templateVars);

            // Load html version if available
            if (pathHtml) {
                if (!cachedTemplate['html']) {
                    cachedTemplate['html'] = yield self.loadEmailTemplate(pathHtml);
                }

                // Compile html template
                compiled = _template(cachedTemplate['html'], {interpolate: /{{([\s\S]+?)}}/g});
                // Add processed HTML to the message object
                message.html = compiled(templateVars);
            }

            // Initialize mailcomposer with message
            const composer = mailcomposer(message);

            // Create MIME string
            const mimeString = yield new Promise((resolve, reject) => {
                composer.build((error, message) => {
                    if (error) reject(error);
                    resolve(message);
                });
            });

            // Assemble payload object for SMTP
            const payload = {
                to: message.to,
                message: mimeString.toString('utf8')
            };

            let mailOptions = {
                to: message.to,
                html: mail.text,
                subject: mail.subject,
                from: adapterOptions.fromAddress
            };

            return new Promise((resolve, reject) => {
                transporter.sendMail(payload, (error, info) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(info);
                    }
                });
            });

        }).catch(e => console.error(e));
    }

    /**
     * sendMail wrapper to send an email with password reset link
     * The options object would have the parameters link, appName, user
     * @param {Object} options
     * @returns {Promise}
     */
    sendPasswordResetEmail({link, appName, user}) {
        return this._sendMail({templateName: 'passwordResetEmail', link, appName, user});
    }

    /**
     * sendMail wrapper to send an email with an account verification link
     * The options object would have the parameters link, appName, user
     * @param {Object} options
     * @returns {Promise}
     */
    sendVerificationEmail({link, appName, user}) {
        return this._sendMail({templateName: 'verificationEmail', link, appName, user});
    }

    /**
     * sendMail wrapper to send general purpose emails
     * The options object would have the parameters:
     * - templateName: name of template to be used
     * - subject: overrides the default value
     * - fromAddress: overrides the default from address
     * - recipient: email's recipient
     * - variables: An object whose property names represent template variables,
     *              and whose values will replace the template variable placeholders
     * @param {Object} options
     * @returns {Promise}
     */
    send({templateName, subject, fromAddress, recipient, variables = {}}) {
        return this._sendMail({templateName, subject, fromAddress, recipient, variables, direct: true});
    }

    /**
     * Simple Promise wrapper to asynchronously fetch the contents of a template.
     * @param {String} path
     * @returns {Promise}
     */
    loadEmailTemplate(path) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, data) => {
                if (err) reject(err);
                resolve(data);
            });
        });
    }
}

module.exports = AnotherSmtpAdapter;
