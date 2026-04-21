function buildPaginationMeta(limit, offset, totalFetched, itemsLength) {
    const has_more = totalFetched > limit 
    const next_offset = has_more ? offset + limit : null;

    return {
        limit,
        offset,
        count : itemsLength,
        has_more,
        next_offset
    };
}

function buildCursorPaginationMeta(limit, fetchedCount, items) {
    const has_more = fetchedCount > limit;

    let next_cursor_created_at = null;
    let next_cursor_id = null;

    if (has_more && items.length > 0) {
        const lastItem = items[items.length - 1];

        next_cursor_created_at = lastItem.entry.created_at;
        next_cursor_id = Number(lastItem.entry.id);
    }

    return {
        limit,
        count: items.length,
        has_more,
        next_cursor_created_at,
        next_cursor_id
    };
}

module.exports = {
    buildPaginationMeta,
    buildCursorPaginationMeta
};