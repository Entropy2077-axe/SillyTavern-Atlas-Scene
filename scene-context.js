export function loreText(entries, substitute = text => text) {
    return [...new Set((entries || []).filter(e => !e.disable && e.content)
        .map(e => substitute(String(e.content))))].join('\n\n').slice(0, 24000);
}
export function characterText(context) {
    const selected = context.groupId
        ? (context.groups?.find(g => String(g.id) === String(context.groupId))?.members || [])
            .map(avatar => context.characters?.find(c => c.avatar === avatar)).filter(Boolean)
        : [context.characters?.[context.characterId]].filter(Boolean);
    return selected.map(c => {
        const data = c.data || c;
        return [c.name || data.name, data.description, data.personality, data.scenario].filter(Boolean).join('\n');
    }).join('\n\n').slice(0, 16000);
}
