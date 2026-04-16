function buildCardHeader(hydratedEntry) {
    return {
        full_name: hydratedEntry.author.full_name,
        username: hydratedEntry.author.username,
        profile_image_url: hydratedEntry.author.profile_image_url,
        created_at: hydratedEntry.created_at,
    };
}

function buildRepostInfo(reposter, repostEntry) {
  return {
    repost_entry_id: repostEntry.id,
    created_at: repostEntry.created_at,
    reposter: {
        id: reposter.id,
        full_name: reposter.full_name,
        username: reposter.username,
        profile_image_url: reposter.profile_image_url,
    },
    label: `${reposter.full_name} tarafından repostlandı.`,
  };
}

module.exports = { buildCardHeader, buildRepostInfo };