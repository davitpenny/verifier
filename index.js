// Meridian: auto-grant "Verified" the moment "Premium" is added, one time,
// permanently. This bot never removes roles, it only ever adds Verified.
// Whop's cancel/past-due logic can do whatever it wants to Premium, that
// logic has no way to touch Verified because this bot doesn't watch for
// Premium being removed, only for it being added.

const { Client, GatewayIntentBits, Partials } = require('discord.js');

// ---- fill these in ----
const BOT_TOKEN = process.env.BOT_TOKEN;                 // from the Discord Developer Portal
const GUILD_ID = process.env.GUILD_ID;                   // your server's ID
const PREMIUM_ROLE_ID = process.env.PREMIUM_ROLE_ID;      // the role Whop assigns on purchase
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;    // the role MEE6 gives after captcha
// ------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // required: this is a "privileged intent",
                                     // enable it in the Developer Portal -> Bot -> Privileged Gateway Intents
  ],
  partials: [Partials.GuildMember],
});

async function grantIfPremium(member, reason) {
  if (member.guild.id !== GUILD_ID) return;
  if (!member.roles.cache.has(PREMIUM_ROLE_ID)) return;
  if (member.roles.cache.has(VERIFIED_ROLE_ID)) return;
  await member.roles.add(VERIFIED_ROLE_ID, reason);
  console.log(`Granted Verified to ${member.user.tag} (${member.id}): ${reason}`);
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}, watching guild ${GUILD_ID}`);
  // startup sweep: catch anyone who already has Premium but not Verified
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const members = await guild.members.fetch();
    for (const m of members.values()) {
      try { await grantIfPremium(m, 'Startup sweep: Premium member'); }
      catch (e) { console.error(`Sweep failed for ${m.id}:`, e.message); }
    }
    console.log('Startup sweep done');
  } catch (err) {
    console.error('Startup sweep failed:', err);
  }
});

// Whop often adds the member WITH the Premium role already attached,
// which fires guildMemberAdd, not guildMemberUpdate.
client.on('guildMemberAdd', async (member) => {
  try {
    // roles can land a moment after the join event, so check now and again shortly
    await grantIfPremium(member, 'Premium on join via Whop');
    setTimeout(async () => {
      try {
        const fresh = await member.guild.members.fetch(member.id);
        await grantIfPremium(fresh, 'Premium shortly after join via Whop');
      } catch (e) { console.error('Delayed join check failed:', e.message); }
    }, 5000);
  } catch (err) {
    console.error('Failed on member add:', err);
  }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const hadPremiumBefore = oldMember.roles.cache.has(PREMIUM_ROLE_ID);
    if (hadPremiumBefore) return; // only act when Premium is newly added
    await grantIfPremium(newMember, 'Auto-granted: Premium added via Whop');
  } catch (err) {
    console.error('Failed to grant Verified role:', err);
  }
});

client.login(BOT_TOKEN);
