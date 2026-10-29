
// Cloudflare Worker: 読み取り専用NFT保有照会
// APIキーは Worker の Secret に保存。ブラウザへ送らない。

const WALLET = /^0x[a-fA-F0-9]{40}$/;

const norm = v => String(v || '').trim().toLowerCase();

const count = n => {
  const q = Number(n.quantity_string ?? n.quantity ?? 1);
  return Number.isSafeInteger(q) && q >= 0 ? q : 1;
};

const matches = (n, c) =>
  (!!c.contract && norm(n.contract) === norm(c.contract)) ||
  (!!c.collection && norm(n.collection) === norm(c.collection));

export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    const allowed = String(
      env.ALLOWED_ORIGINS || 'https://japan47pixel.net'
    ).split(',').map(x => x.trim()).filter(Boolean);

    const local =
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    const permitted =
      !origin || allowed.includes(origin) || local;

    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin':
        origin && permitted ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Content-Type',
      'Vary': 'Origin',
      'Cache-Control': 'no-store'
    };

    const reply = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });

    if (!permitted) {
      return reply({
        ok:false,
        error:'Origin not allowed'
      },403);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null,{
        status:204,
        headers
      });
    }

    if (
      request.method !== 'GET' ||
      u.pathname !== '/api/owned'
    ) {
      return reply({
        ok:false,
        error:'Not found'
      },404);
    }

    const address =
      (u.searchParams.get('address') || '').trim();

    if (!WALLET.test(address)) {
      return reply({
        ok:false,
        error:'Invalid wallet address'
      },400);
    }

    if (!env.OPENSEA_API_KEY) {
      return reply({
        ok:false,
        error:'OPENSEA_API_KEY is missing'
      },503);
    }

    if (!/^https:\/\//.test(env.CATALOG_URL || '')) {
      return reply({
        ok:false,
        error:'CATALOG_URL is missing'
      },503);
    }

    try {
      const response = await fetch(
        env.CATALOG_URL,
        {
          headers:{Accept:'application/json'},
          cache:'no-store'
        }
      );

      if (!response.ok) {
        throw Error(
          'journey.json: HTTP '+response.status
        );
      }

      const catalog = await response.json();

      if (
        !Array.isArray(catalog.stops) ||
        catalog.stops.length !== 47
      ) {
        throw Error(
          'journey.json must contain 47 stops'
        );
      }

      const ticketRegistry = [];
      const artRegistry = [];

      for (const p of catalog.stops) {
        for (const [key, collection] of [
          ['ticket',ticketRegistry],
          ['art',artRegistry]
        ]) {
          const c = p[key];

          if (c?.status !== 'released') {
            continue;
          }

          if (!c.collection && !c.contract) {
            throw Error(
              `${p.code} ${key}: released but collection/contract is empty`
            );
          }

          collection.push({
            prefecture:p.code,
            collection:c.collection||'',
            contract:c.contract||''
          });
        }
      }

      const chain =
        catalog.settings?.openSeaChain || 'robinhood';

      // 25ページ以上は不完全な0枚判定を避けるためエラーにする。
      const all = [];
      let next = '';

      for (let page = 0; page < 25; page++) {
        const endpoint = new URL(
          `https://api.opensea.io/api/v2/chain/${
            encodeURIComponent(chain)
          }/account/${address}/nfts`
        );

        endpoint.searchParams.set('limit','200');
        endpoint.searchParams.set(
          'include_auto_hidden','true'
        );

        if (next) {
          endpoint.searchParams.set('next',next);
        }

        const r = await fetch(endpoint,{
          headers:{
            'accept':'application/json',
            'x-api-key':env.OPENSEA_API_KEY
          }
        });

        if (!r.ok) {
          throw Error('OpenSea HTTP '+r.status);
        }

        const data = await r.json();

        if (!Array.isArray(data.nfts)) {
          throw Error('OpenSea: invalid response');
        }

        all.push(...data.nfts);

        next =
          typeof data.next === 'string'
            ? data.next : '';

        if (!next) break;

        if (page === 24) {
          throw Error(
            'NFT pagination limit reached'
          );
        }
      }

      const clean = (n,prefecture) => ({
        prefecture,
        identifier:String(n.identifier ?? ''),
        contract:String(n.contract || ''),
        collection:String(n.collection || ''),
        name:String(n.name || ''),
        image_url:String(
          n.image_url || n.display_image_url || ''
        ),
        traits:Array.isArray(n.traits)
          ? n.traits : [],
        quantity:count(n)
      });

      const art = [];
      const tickets = [];

      for (const n of all) {
        const t = ticketRegistry.find(
          c => matches(n,c)
        );

        if (t) {
          tickets.push(clean(n,t.prefecture));
          continue;
        }

        const a = artRegistry.find(
          c => matches(n,c)
        );

        if (a) {
          art.push(clean(n,a.prefecture));
        }
      }

      return reply({
        ok:true,
        address,
        chain,
        art,
        tickets,
        checkedAt:new Date().toISOString()
      });

    } catch (e) {
      return reply({
        ok:false,
        error:String(e.message || e)
      },502);
    }
  }
};
