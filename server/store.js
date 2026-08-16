/**
 * store.js — Supabase-backed data store
 * Thay thế hoàn toàn JSON file store.
 * Interface giống hệt (getAccounts, addAccount, v.v.) để không cần sửa index.js.
 */
import { supabase } from './supabase.js';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Helper: camelCase ↔ snake_case ──────────────────────
function toSnake(acc) {
  return {
    id:           acc.id,
    username:     acc.username,
    display_name: acc.displayName,
    avatar_emoji: acc.avatarEmoji,
    avatar_color: acc.avatarColor,
    status:       acc.status,
    is_connected: acc.isConnected,
    followers:    acc.followers,
    viewers:      acc.viewers,
    likes:        acc.likes,
    room_id:      acc.roomId || null,
    selected:     acc.selected,
  };
}

function toCamel(row) {
  if (!row) return null;
  return {
    id:           row.id,
    username:     row.username,
    displayName:  row.display_name,
    avatarEmoji:  row.avatar_emoji,
    avatarColor:  row.avatar_color,
    status:       row.status,
    isConnected:  row.is_connected,
    followers:    row.followers,
    viewers:      row.viewers,
    likes:        row.likes,
    roomId:       row.room_id,
    selected:     row.selected,
    createdAt:    row.created_at,
  };
}

function ruleToSnake(r) {
  return {
    id:           r.id,
    gift_name:    r.giftName,
    gift_emoji:   r.giftEmoji,
    action:       r.action,
    duration_sec: r.durationSec,
    priority:     r.priority,
    active:       r.active,
  };
}

function ruleToCamel(row) {
  if (!row) return null;
  return {
    id:          row.id,
    giftName:    row.gift_name,
    giftEmoji:   row.gift_emoji,
    action:      row.action,
    durationSec: row.duration_sec,
    priority:    row.priority,
    active:      row.active,
  };
}

function danceToSnake(d) {
  return {
    id:           d.id,
    name:         d.name,
    duration:     d.duration,
    duration_sec: d.durationSec,
    category:     d.category,
    emoji:        d.emoji,
  };
}

function danceToCamel(row) {
  if (!row) return null;
  return {
    id:          row.id,
    name:        row.name,
    duration:    row.duration,
    durationSec: row.duration_sec,
    category:    row.category,
    emoji:       row.emoji,
  };
}

// ─── ACCOUNTS ────────────────────────────────────────────
export async function getAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('[Store] getAccounts:', error.message); return []; }
  return (data || []).map(toCamel);
}

export async function addAccount(account) {
  const newAccount = {
    id:           generateId(),
    username:     account.username.replace('@', ''),
    display_name: account.displayName || `@${account.username.replace('@', '')}`,
    avatar_emoji: account.avatarEmoji || '👤',
    avatar_color: account.avatarColor || '#E91E8C',
    status:       'offline',
    is_connected: false,
    followers:    '0',
    viewers:      '0',
    likes:        '0',
    room_id:      null,
    selected:     false,
  };

  // If first account, auto-select
  const existing = await getAccounts();
  if (!existing.length) newAccount.selected = true;

  const { data, error } = await supabase.from('accounts').insert(newAccount).select().single();
  if (error) { console.error('[Store] addAccount:', error.message); return null; }
  return toCamel(data);
}

export async function updateAccount(id, updates) {
  const snakeUpdates = {};
  if (updates.displayName  !== undefined) snakeUpdates.display_name = updates.displayName;
  if (updates.avatarEmoji  !== undefined) snakeUpdates.avatar_emoji  = updates.avatarEmoji;
  if (updates.avatarColor  !== undefined) snakeUpdates.avatar_color  = updates.avatarColor;
  if (updates.status       !== undefined) snakeUpdates.status        = updates.status;
  if (updates.isConnected  !== undefined) snakeUpdates.is_connected  = updates.isConnected;
  if (updates.followers    !== undefined) snakeUpdates.followers     = updates.followers;
  if (updates.viewers      !== undefined) snakeUpdates.viewers       = updates.viewers;
  if (updates.likes        !== undefined) snakeUpdates.likes         = updates.likes;
  if (updates.roomId       !== undefined) snakeUpdates.room_id       = updates.roomId;
  if (updates.selected     !== undefined) snakeUpdates.selected      = updates.selected;

  const { data, error } = await supabase.from('accounts').update(snakeUpdates).eq('id', id).select().single();
  if (error) { console.error('[Store] updateAccount:', error.message); return null; }
  return toCamel(data);
}

export async function deleteAccount(id) {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) { console.error('[Store] deleteAccount:', error.message); return false; }
  return true;
}

export async function selectAccount(id) {
  // Deselect all, then select target
  await supabase.from('accounts').update({ selected: false }).neq('id', '');
  await supabase.from('accounts').update({ selected: true }).eq('id', id);
  return getAccounts();
}

// ─── RULES ───────────────────────────────────────────────
export async function getRules() {
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .order('priority', { ascending: true });
  if (error) { console.error('[Store] getRules:', error.message); return []; }
  return (data || []).map(ruleToCamel);
}

export async function addRule(rule) {
  const newRule = {
    id:           generateId(),
    gift_name:    rule.giftName || 'New Gift',
    gift_emoji:   rule.giftEmoji || '🎁',
    action:       rule.action || 'Dance - Cute',
    duration_sec: rule.durationSec || 8,
    priority:     rule.priority || 1,
    active:       rule.active !== undefined ? rule.active : true,
  };
  const { data, error } = await supabase.from('rules').insert(newRule).select().single();
  if (error) { console.error('[Store] addRule:', error.message); return null; }
  return ruleToCamel(data);
}

export async function updateRule(id, updates) {
  const snakeUpdates = {};
  if (updates.giftName    !== undefined) snakeUpdates.gift_name    = updates.giftName;
  if (updates.giftEmoji   !== undefined) snakeUpdates.gift_emoji   = updates.giftEmoji;
  if (updates.action      !== undefined) snakeUpdates.action       = updates.action;
  if (updates.durationSec !== undefined) snakeUpdates.duration_sec = updates.durationSec;
  if (updates.priority    !== undefined) snakeUpdates.priority     = updates.priority;
  if (updates.active      !== undefined) snakeUpdates.active       = updates.active;

  const { data, error } = await supabase.from('rules').update(snakeUpdates).eq('id', id).select().single();
  if (error) { console.error('[Store] updateRule:', error.message); return null; }
  return ruleToCamel(data);
}

export async function deleteRule(id) {
  const { error } = await supabase.from('rules').delete().eq('id', id);
  if (error) { console.error('[Store] deleteRule:', error.message); return false; }
  return true;
}

export async function reorderRules(orderedIds) {
  // Update priority for each rule based on order
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('rules').update({ priority: idx + 1 }).eq('id', id)
    )
  );
  return getRules();
}

// ─── DANCES ──────────────────────────────────────────────
export async function getDances() {
  const { data, error } = await supabase
    .from('dances')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('[Store] getDances:', error.message); return []; }
  return (data || []).map(danceToCamel);
}

export async function addDance(dance) {
  const sec = dance.durationSec || 8;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  const newDance = {
    id:           generateId(),
    name:         dance.name || 'New Animation',
    duration:     `${m}:${s}`,
    duration_sec: sec,
    category:     dance.category || 'dance',
    emoji:        dance.emoji || '💃',
  };
  const { data, error } = await supabase.from('dances').insert(newDance).select().single();
  if (error) { console.error('[Store] addDance:', error.message); return null; }
  return danceToCamel(data);
}

export async function updateDance(id, updates) {
  const snakeUpdates = {};
  if (updates.name     !== undefined) snakeUpdates.name     = updates.name;
  if (updates.category !== undefined) snakeUpdates.category = updates.category;
  if (updates.emoji    !== undefined) snakeUpdates.emoji    = updates.emoji;
  if (updates.durationSec !== undefined) {
    const m = String(Math.floor(updates.durationSec / 60)).padStart(2, '0');
    const s = String(updates.durationSec % 60).padStart(2, '0');
    snakeUpdates.duration_sec = updates.durationSec;
    snakeUpdates.duration     = `${m}:${s}`;
  }
  const { data, error } = await supabase.from('dances').update(snakeUpdates).eq('id', id).select().single();
  if (error) { console.error('[Store] updateDance:', error.message); return null; }
  return danceToCamel(data);
}

export async function deleteDance(id) {
  const { error } = await supabase.from('dances').delete().eq('id', id);
  if (error) { console.error('[Store] deleteDance:', error.message); return false; }
  return true;
}

// ─── SETTINGS ────────────────────────────────────────────
const DEFAULTS = {
  autoDance:      true,
  receiveGifts:   true,
  stageEffects:   true,
  audio:          true,
  volume:         70,
  selectedDanceId: null,
  avatarModelUrl:  null,
};

export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*');
  if (error) { console.error('[Store] getSettings:', error.message); return DEFAULTS; }
  const result = { ...DEFAULTS };
  for (const row of data || []) {
    result[row.key] = row.value;
  }
  return result;
}

export async function updateSettings(updates) {
  const upserts = Object.entries(updates).map(([key, value]) => ({ key, value }));
  const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' });
  if (error) { console.error('[Store] updateSettings:', error.message); }
  return getSettings();
}
