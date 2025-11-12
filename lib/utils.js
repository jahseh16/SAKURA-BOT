const groupMetadataCache = new Map();
const lidCache = new Map();

async function resolveLidToRealJid(
  lid,
  conn,
  groupChatId,
  maxRetries = 3,
  retryDelay = 1000,
) {
  const inputJid = lid?.toString();

  if (
    !inputJid ||
    !inputJid.endsWith("@lid") ||
    !groupChatId?.endsWith("@g.us")
  ) {
    return inputJid?.includes("@") ? inputJid : `${inputJid}@s.whatsapp.net`;
  }

  if (lidCache.has(inputJid)) return lidCache.get(inputJid);

  const lidToFind = inputJid.split("@")[0];
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      let metadata;
      if (groupMetadataCache.has(groupChatId)) {
        metadata = groupMetadataCache.get(groupChatId);
      } else {
        metadata = await conn?.groupMetadata(groupChatId);
        if (metadata) {
          groupMetadataCache.set(groupChatId, metadata);
          setTimeout(() => groupMetadataCache.delete(groupChatId), 300000);
        }
      }

      if (!metadata?.participants)
        throw new Error("No se obtuvieron participantes");

      for (const participant of metadata.participants) {
        try {
          if (!participant?.jid) continue;
          const contactDetails = await conn?.onWhatsApp(participant.jid);
          if (!contactDetails?.[0]?.lid) continue;
          const possibleLid = contactDetails[0].lid.split("@")[0];
          if (possibleLid === lidToFind) {
            lidCache.set(inputJid, participant.jid);
            return participant.jid;
          }
        } catch (e) {
          continue;
        }
      }

      lidCache.set(inputJid, inputJid);
      return inputJid;
    } catch (error) {
      if (++attempts >= maxRetries) {
        lidCache.set(inputJid, inputJid);
        return inputJid;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return inputJid;
}

module.exports = { resolveLidToRealJid };
