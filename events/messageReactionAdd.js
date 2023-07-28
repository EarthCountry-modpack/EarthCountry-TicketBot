const config = require(`../config.json`);
const fs = require('fs');
const { contining } = require('../commands/startapps.js');
module.exports = (client, messageReaction, user) => {
  if (user.bot) return; // Ignore bot's reactions

  // Readfile collectors.json and save it in a variable
  let collectors = JSON.parse(fs.readFileSync('./collectors.json', 'utf8'));

  // Handle collectors
  if (collectors.collector.filter((e) => e.id === messageReaction.message.id).length > 0) {
    if (messageReaction.emoji.name === '📩') {
      let channelname = `ticket-${user.username}`;
      channelname = channelname.replace(/\s/g, '-').toLowerCase();
      if (messageReaction.message.guild.channels.cache.find((channel) => channel.name === channelname) && config.one_app) {
        user.send(`Vous avez déjà un ticket ouvert.`).catch(console.error);
        return messageReaction.users.remove(user.id);
      }
      contining(client, messageReaction.message, user);
      messageReaction.users.remove(user.id);
    }
  }

  // Handle tickets
  if (collectors.tickets.filter((e) => e.id === messageReaction.message.id).length > 0) {
    let channel = messageReaction.message.guild.channels.cache.find((channel) => channel.id === messageReaction.message.channel.id);
    const ownerID = collectors.tickets.filter((e) => e.id === messageReaction.message.id)[0].owner;
    // Get owner of the ticket
    client.users.fetch(ownerID).then((owner) => {
      switch (messageReaction.emoji.name) {
        case '🔒':
          if (!checkUser(messageReaction.message, user) && !config.allow_user_lock) {
            user.send('Seul le staff peut bloquer les channels.');
            return messageReaction.users.remove(user.id);
          }
          if (channel.permissionOverwrites.cache.get(ownerID)?.deny.has('SEND_MESSAGES')) {
            user.send('Ce channel est déjà bloqué 🔒');
            return messageReaction.users.remove(user.id);
          }
          channel.permissionOverwrites.edit(owner, {
            SEND_MESSAGES: false,
          });
          return messageReaction.message.channel.send('Channel bloqué 🔒');
        case '🔓':
          if (!checkUser(messageReaction.message, user) && !config.allow_user_unlock) {
            user.send('Seul le staff peut débloquer les channels.');
            return messageReaction.users.remove(user.id);
          }
          if (channel.permissionOverwrites.cache.get(ownerID)?.allow.has('SEND_MESSAGES')) {
            user.send('Ce channel est déjà débloqué 🔓');
            return messageReaction.users.remove(user.id);
          }
          channel.permissionOverwrites.edit(owner, {
            SEND_MESSAGES: true,
          });
          return messageReaction.message.channel.send('Channel débloqué 🔓');
        case '⛔':
          if (!messageReaction.message.guild.channels.cache.find((c) => c.name.toLowerCase() === channel.name)) return;
          if (!checkUser(messageReaction.message, user) && !config.allow_user_delete) {
            user.send('Seul le staff peut supprimer les channels.').catch(console.error);
            return messageReaction.users.remove(user.id);
          }

          setTimeout(() => {
            if (messageReaction.message.guild.channels.cache.find((c) => c.name.toLowerCase() === channel.name)) channel.delete();
            removeTicketfromCollectors(messageReaction.message.id);
          }, 5000);

          return messageReaction.message.channel.send('Suppression du channel dans 5 secondes !');
      }
    });
  }
};

const checkUser = (message, user) => {
  if (message.guild.members.cache.find((member) => member.id === user.id).permissions.has('ADMINISTRATOR')) return true;

  const roles = config.Channelrole.some((role) => {
    if (message.guild.members.cache.find((member) => member.id === user.id).roles.cache.find((r) => r.id === role)) return true;
  });
  if (roles) return true;

  return false;
};
const removeTicketfromCollectors = (MessageID) => {
  let collectors = JSON.parse(fs.readFileSync('./collectors.json', 'utf8'));
  collectors.tickets = collectors.tickets.filter((e) => e.id !== MessageID);
  const json = JSON.stringify(collectors);
  fs.writeFile('./collectors.json', json, 'utf8', (err) => {
    if (err) throw err;
  });
};
