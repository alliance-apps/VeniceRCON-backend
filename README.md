# Venice Rcon Backend

## Installation

```bash
#install dependencies
npm install

#install ts-node globally
sudo npm install -g ts-node

#copy the default config.default.yaml to config.yaml
#and edit the configuration to your needs
cp config.default.yaml config.yaml

#start the tool with
npm start
```

## Permissions

> INSTANCE

* `INSTANCE#CREATE` Create new Instances
* `INSTANCE#UPDATE` Update an Instance
* `INSTANCE#DELETE` Delete an Instance

> USER

* `USER#ADD` Add a User to the Instance
* `USER#REMOVE` Remove a User from the Instance
* `USER#MODIFY` Modify Permissions of a user