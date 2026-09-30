/* Recoverable material transfers between the two existing save formats. */
(function (root) {
  'use strict';
  const FARM = 'pixelfarm-v1', MINE = 'yard-world-v1', JOURNAL = 'backyard-transfer-v1';
  const MATERIALS = Object.freeze({wood: '4', stone: '2', coal: 'coal', copper: 'copper', iron: 'iron', gold: 'gold', crystal: 'crystal', relic: 'relic'});
  const count = n => Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 999999) : 0;
  function recover(storage = root.localStorage) {
    const raw = storage.getItem(JOURNAL);
    if (!raw) return false;
    const entry = JSON.parse(raw);
    if (entry.v !== 1 || !entry.farm?.town || !entry.mine?.inv) throw new Error('物资存档需要恢复，请保留浏览器数据。');
    storage.setItem(FARM, JSON.stringify(entry.farm));
    storage.setItem(MINE, JSON.stringify(entry.mine));
    storage.removeItem(JOURNAL);
    return true;
  }
  function transfer(direction, storage = root.localStorage) {
    if (!['to-mine', 'to-farm'].includes(direction)) throw new Error('未知物资方向');
    recover(storage);
    const farm = JSON.parse(storage.getItem(FARM)), mine = JSON.parse(storage.getItem(MINE));
    if (!farm?.town || !mine?.inv) throw new Error('请先保存两侧进度再运送物资。');
    farm.town.stock ||= {};
    const moved = {};
    for (const [id, slot] of Object.entries(MATERIALS)) {
      const from = direction === 'to-mine' ? farm.town.stock : mine.inv;
      const to = direction === 'to-mine' ? mine.inv : farm.town.stock;
      const fromKey = direction === 'to-mine' ? id : slot, toKey = direction === 'to-mine' ? slot : id;
      const n = Math.min(count(from[fromKey]), 999999 - count(to[toKey]));
      if (!n) continue;
      from[fromKey] -= n; to[toKey] = count(to[toKey]) + n; moved[id] = n;
    }
    // Persist the complete intended result before either save changes. Recovery
    // rolls forward after interruption, so repeated visits cannot duplicate goods.
    storage.setItem(JOURNAL, JSON.stringify({v: 1, farm, mine}));
    recover(storage);
    return {farm, mine, moved};
  }
  root.BackyardStorage = Object.freeze({recover, transfer, MATERIALS});
  try { recover(); } catch (error) { root.backyardStorageError = error.message; }
})(globalThis);
