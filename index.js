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

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}, watching guild ${GUILD_ID}`);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    if (newMember.guild.id !== GUILD_ID) return;

    const hadPremiumBefore = oldMember.roles.cache.has(PREMIUM_ROLE_ID);
    const hasPremiumNow = newMember.roles.cache.has(PREMIUM_ROLE_ID);
    const alreadyVerified = newMember.roles.cache.has(VERIFIED_ROLE_ID);

    // only act on the moment Premium is newly added, and only if they don't
    // already have Verified (avoids redundant API calls on every renewal)
    if (!hadPremiumBefore && hasPremiumNow && !alreadyVerified) {
      await newMember.roles.add(VERIFIED_ROLE_ID, 'Auto-granted: Premium member via Whop, skip captcha');
      console.log(`Granted Verified to ${newMember.user.tag} (${newMember.id})`);
    }
  } catch (err) {
    console.error('Failed to grant Verified role:', err);
  }
});

client.login(BOT_TOKEN);
