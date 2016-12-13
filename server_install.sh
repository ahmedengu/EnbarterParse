sudo apt-get update
sudo apt-get upgrade

wget -O- https://raw.github.com/ajenti/ajenti/1.x/scripts/install-ubuntu.sh | sudo sh
ufw allow 8000

sudo apt-get autoremove && sudo apt-get remove apache2*
sudo apt-get install ajenti-v ajenti-v-nginx ajenti-v-mail ajenti-v-ftp-pureftpd ajenti-v-nodejs ajenti-v-php7.0-fpm php7.0-mysql
sudo apt-get install bind9
sudo apt-get install fail2ban

sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo "deb http://repo.mongodb.org/apt/ubuntu "$(lsb_release -sc)"/mongodb-org/3.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

sudo apt-get install python-pip build-essential python-dev libssl-dev
sudo pip install pymongo

sudo apt-get install mysql-server
sudo mysql_secure_installation
sudo mysql_install_db

sudo apt-get install nginx

curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install nodejs

apt-get install supervisor


sudo apt-get install git
sudo apt-get install phantomjs
sudo apt-get -y install redis-server



mongo admin

db.createUser(
  {
    user: "mongoadmin",
    pwd: "68b1f5a1cd1f611123e0cc19e985aafa7032e910787e0dee5023181036de8501f5b8d0080d37994d5bce0f396e8ebf39ce43dd60bc2c8f35",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
  }
)

use enbarterDB

db.createUser(
    {
      user: "enbarterUser",
      pwd: "1d9bd5d441415fc6556acb447b97903f1623d16fd9d56fe",
      roles: [
         { role: "readWrite", db: "newdb" },
      ]
    }
)

exit


echo "nano /etc/mongod.conf
add :::

security:
   authorization: enabled


visit :
http://mono.software/2016/02/22/Installing-Prerender-io/
https://gist.github.com/thoop/8165802


sudo nano /etc/redis/redis.conf
requirepass 16b5c2300edd0a70b824714fea0e8144e177c888e0ef0977a0b77943d525ef6c
"


