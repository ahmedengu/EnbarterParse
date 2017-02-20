#!/usr/bin/env bash
# Ubuntu 16.04.1 x64

sudo apt-get update -y
sudo apt-get upgrade -y
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo add-apt-repository ppa:ondrej/php
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.2.list
sudo apt-get update -y

wget -O- https://raw.github.com/ajenti/ajenti/1.x/scripts/install-ubuntu.sh | sudo sh
ufw allow 8000

sudo apt-get autoremove && sudo apt-get remove apache2*
sudo apt-get install -y ajenti-v ajenti-v-nginx ajenti-v-mail ajenti-v-ftp-pureftpd ajenti-v-nodejs ajenti-v-php7.0-fpm php7.0-mysql php7.0-mbstring php7.0-cli php7.0-curl php7.0-dom apache2-utils
sudo apt-get install -y bind9
sudo apt-get install -y fail2ban

sudo apt-get install -y mongodb-org python-pip build-essential python-dev libssl-dev unzip
sudo pip install pymongo
sudo systemctl enable mongod

sudo apt-get install -y mysql-server
sudo mysql_secure_installation
#sudo mysql_install_db


sudo apt-get install -y nodejs




sudo apt-get install -y git phantomjs
#sudo apt-get install -y redis-server

ssh-keygen -t rsa

sudo apt-get install -y gitolite3
#/root/.ssh/id_rsa.pub
service ajenti restart

sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

mongo admin

db.createUser(
  {
    user: "admin",
    pwd: "68b1f5a1cd1f611123e0cc19e",
    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
  }
)

use enbarterDB

db.createUser(
    {
      user: "enbarterUser",
      pwd: "1d9bd5d441415fc6556acb447b97903f1623d16fd9d56fe",
      roles: [
         { role: "readWrite", db: "enbarterDB" },
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


https://www.digitalocean.com/community/tutorials/how-to-add-swap-on-ubuntu-14-04
"


