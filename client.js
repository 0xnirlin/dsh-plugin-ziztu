/**
 * Ziztu for DeepSeek Harness: browser half.
 *
 * One settings section ("Ziztu") with the API key field, a link to the page that
 * makes keys, the connection status, a short list of things to ask, and the tool
 * list. Hand-written ModuleLoader bundle: no build step, no dependency beyond the
 * `react` the shell provides. Colors come from the shell's theme variables.
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-ziztu',
  factory: require => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const { createElement: h, useState, useEffect, useCallback } = React

    const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAAYMSURBVHic7Z1daBxVFMf/Z5I0JLP1A19qUQR9EDpp/QIpghRfBEWQ2uymWqRQa6tUBH3yzRRRRPHFD6y1DRaxtrsWHxUURERRwa82kwdBH4q2pSB+ZDdpk+xcX5Kw2exmd3bm3Ll37vk9ZWcnZw77/8//3MzObghMTJc2lTxF7ytgHdcxXICAuYjUo+vLU2Wm+umgFKhWCqK06gnt8cuhRwSVRq3EBqgWNx0B6LE0mhHioo4WKlN7k1To2QDTo8FhIjye5OBCOhBw2K+E+3v83XiocXi1MKj3cjCBl15GQywDVIvBOQDXxu5M0Mn5QiXc2O3OXRugWgxSWXQIeihUwq607WonEd9OujFBxx1EfLvpZII1nxTx88FaJmj7hIifL9qZwGu1sVoMzrN3JGilWgr+bLV9lQHUODwAG7R0JehDYeOititYtUEu8uSXVtquMEB1NHhPa0eCdqqlkaONj1cmAGG37oYEzSi1p/HhsgGmSyOHMmlI0E6j1ssGIKV6ejdJsI9GrT0s3syRaUdCZhDkoo+zFCohtbwQJLiDGMBxaGZ05KGI1KmsGxH0Q+Rtp2oxqEsSuArVPRHfZVSfiO84YgDHEQM4jhjAccQAjiMGcBwxgOP0Z91AWvjlyaxb6IlaaSTT4+ciAWwV3wSsNgCtGxTxE2LtCBh88gX037M96zasx0oDyFmfHtaNABE/XewxAJGIz4AVBhh4YDf8k2eybiOXGL8G8D/8Gegzvk1rMfqVlcjnx9gRIOLrwTgD9N2+TcTXiFEjYHjia1DhyqzbcApjDCBnfTYYMQJE/OwwIgGyfku0E1wGjc7+ylI3DkYYwGS4xJ999kFEf/zGUjsOYoB2eB78E6dZSpuUeEasAUxjYMd+J8SHJMBq/BOnAS/980L99zdm9t6det2kiAEa4Jr3l17ch/ov37DUTooYYBEu8U2L/GacXwP0b73XWfHhegL4x74FhgrpF16YR+2R29Kvy4CzBuA66+cmXsL8p8dZanPgpAH4In8zkM6/89OGU2sA78aAed7bJT5cSoDh1z8BbbiepbYNi712OJEAfnmSRfyFzytWiw8XEoAt8nfdAcxfZqmtk9wmAF11De+8z4H4yGsCDD0/AS+4k6W27ZHfTO4MwHbzRvg9Zg/u6WJPu8iVAbjEn9m3Deqfv1hqZ00+DDAwCP+DH1hK5y3ym7F+ETj4xEERPwFWJwBX5KsLZzHz9P0stU3DWgOw3az53Bii30OW2iZioQEIfpnno+IuRH4zVq0BBu7bJeKnjDUJ4B//CegfSL/wbBW13VvTr2sJVhiAa95ffu0ZLHz3GUttWzDeAC7fr6cDY9cAfbfcJeJrwMgEGD7yFeiKq9MvHEWo7dySfl2LMS4B/PIki/hzJ98Q8VtgVAKwRf7OLUAUsdS2HSMSwLvuJt55L+K3JfMEGHr1FLwbbmapLYu9zmRuAC7xYcFXz5hgUCNGgIuYID7EAPpR1X+NER8mjACXuPTyAdR//DLrNlYgBtCESWd9IzICNGCq+BADMFNfMFp8iAH4mDv2CmoP35p1Gx2RNQADtbHNgLLjo+JigJQxPfKbkRGQIraJDzFAOix88bGV4kNGQHJs/54AMUACbD3rG5ER0CN5EB8AqFoM7Ph7RWBBEsBxxACOIwZwHDGA44gBHEcM4DhiAMfxAKpn3YSQGZHnKZSy7kLIBiJvBwGAXA10k0IlJFkDOI4YwHFo6QcZA25RqIQESQBh2QCK6J1sWxF00ag1NT4hY8ANluIfq0aAwrEsGhL0oRTebXxMzTtICuSbxrMfrRaBfhD2ae1I0EYrbVcZgMYRAbigrStBD4Rzi9o2bW6DjIJ80Rz9S7Q1AMQEuaGd+OhkAIgJrGct8dGNASAmsJZO4qNbA0BMYB3diI847wUsFryYqCtBBxe7FR9xEmAJpUC1UiBfvmsgfjn0iBArqWO/G0gEVaiERFBvx/1dgQel1KFCJaS44qOXBGimNhq8qQgHktYR4kMKb/kfhU8lqpFWMzIa9NFL1LcjNQM0MzO2qRhFVOaq7xKK1Nj68hTLa/k//tCvL2aud80AAAAASUVORK5CYII='
    const NS = 'settings.ziztu'
    const inject = ['slots', 'locale']
    const API = '/api/ziztu'
    const KEY_PAGE = 'https://getziztu.com/app'
    const DOCS = 'https://getziztu.com/connect/deepseek-harness'

    const DICT = {
      en: {
        nav: 'Ziztu',
        title: 'Ziztu',
        sub: 'Plan, write and make micro dramas and anime episodes from your agent.',
        status: 'Connection',
        s_connected: 'Connected',
        s_connecting: 'Connecting',
        s_error: 'Not connected',
        s_nokey: 'Needs an API key',
        s_idle: 'Starting',
        tools_ready: '{n} tools ready',
        keyTitle: 'Your Ziztu API key',
        keyHelp: 'Make a key in the Ziztu studio under Settings, API keys. Give it read to look around, and add generate to make things and export to download films. It starts with sk_sakuga_.',
        getKey: 'Get your API key',
        keyLabel: 'API key',
        keyPlaceholder: 'sk_sakuga_...',
        save: 'Save and connect',
        saving: 'Connecting...',
        savedKey: 'Saved key ending in {end}',
        fromEnv: 'Using the key from your environment or plugin config.',
        removeKey: 'Remove key',
        reconnect: 'Reconnect',
        privacy: 'The key is stored on this computer only, in your Harness home, and is sent only to the server address below.',
        askTitle: 'What you can ask',
        ask1: 'Plan a 60 second vertical micro drama about a baker who finds a love letter in the dough. Show me the price before you make anything.',
        ask2: 'Write the script for episode one of an anime about a lighthouse keeper, then turn it into a shot list.',
        ask3: 'Make the first frames for this project with a cap of 200 credits.',
        ask4: 'Animate shots 1 to 4 and tell me the cost first.',
        ask5: 'What is my credit balance, and what is the status of my jobs?',
        safeTitle: 'Spending stays under your control',
        safe: 'Every tool that spends credits needs a max_credits cap, anything above 500 credits needs your confirmation, and dry_run returns the price without starting anything.',
        toolsTitle: 'Tools',
        toolsNone: 'No tools yet. Add your key to load them.',
        adv: 'Server address',
        advHelp: 'Leave this alone unless you run your own Ziztu server.',
        advSave: 'Save address',
        docs: 'Read the setup guide',
        errBad: 'That does not look like a Ziztu API key. Keys start with sk_sakuga_.',
        errNet: 'Could not reach the plugin. Is the harness still running?',
      },
      zh: {
        nav: 'Ziztu',
        title: 'Ziztu',
        sub: '在你的智能体里策划、编写并制作微短剧和动漫剧集。',
        status: '连接状态',
        s_connected: '已连接',
        s_connecting: '连接中',
        s_error: '未连接',
        s_nokey: '需要 API 密钥',
        s_idle: '启动中',
        tools_ready: '{n} 个工具可用',
        keyTitle: '你的 Ziztu API 密钥',
        keyHelp: '在 Ziztu 工作室的“设置”里的“API keys”中创建密钥。给它 read 权限即可查看，再加上 generate 可以制作内容，加上 export 可以下载成片。密钥以 sk_sakuga_ 开头。',
        getKey: '获取 API 密钥',
        keyLabel: 'API 密钥',
        keyPlaceholder: 'sk_sakuga_...',
        save: '保存并连接',
        saving: '连接中...',
        savedKey: '已保存的密钥，末尾为 {end}',
        fromEnv: '正在使用环境变量或插件配置中的密钥。',
        removeKey: '移除密钥',
        reconnect: '重新连接',
        privacy: '密钥只保存在这台电脑的 Harness 主目录中，只会发送到下面的服务器地址。',
        askTitle: '你可以这样问',
        ask1: '策划一部 60 秒的竖屏微短剧：面包师在面团里发现一封情书。动手之前先告诉我价格。',
        ask2: '为一部以灯塔守望者为主角的动漫写第一集剧本，然后拆成分镜表。',
        ask3: '为这个项目制作首帧，上限 200 积分。',
        ask4: '把第 1 到第 4 个镜头做成动画，先告诉我费用。',
        ask5: '我的积分余额是多少？任务进度如何？',
        safeTitle: '花费始终由你掌控',
        safe: '每个会消耗积分的工具都需要 max_credits 上限，超过 500 积分需要你确认，dry_run 只返回价格、不会开始任何任务。',
        toolsTitle: '工具',
        toolsNone: '暂无工具。填入密钥后会自动加载。',
        adv: '服务器地址',
        advHelp: '除非你运行自己的 Ziztu 服务器，否则请保持默认。',
        advSave: '保存地址',
        docs: '查看设置指南',
        errBad: '这不像是 Ziztu API 密钥。密钥以 sk_sakuga_ 开头。',
        errNet: '无法连接到插件，Harness 还在运行吗？',
      },
    }

    const CSS = `
.zz{--zz-fg:var(--dsw-alias-label-primary,#0b0b0f);--zz-mut:var(--dsw-alias-label-secondary,#55565e);--zz-dim:var(--dsw-alias-label-tertiary,#7c7d86);--zz-line:var(--dsw-alias-border-l1,rgba(128,128,140,.28));--zz-card:var(--dsw-alias-bg-layer-2,rgba(128,128,140,.08));--zz-bg:var(--dsw-alias-bg-layer-1,#fff);--zz-ok:var(--dsw-alias-state-success-primary,#1a8f4c);--zz-err:var(--dsw-alias-state-error-primary,#c8372d);--zz-warn:var(--dsw-alias-state-warning-primary,#b7791f);
font-family:Geist,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--zz-fg);max-width:760px;display:flex;flex-direction:column;gap:28px;padding:8px 2px 40px;line-height:1.5}
.zz *{box-sizing:border-box}
.zz-head{display:flex;gap:16px;align-items:center}
.zz-logo{width:56px;height:56px;border-radius:14px;flex:none}
.zz-h1{font-size:26px;font-weight:650;letter-spacing:-.02em;margin:0}
.zz-sub{font-size:15px;color:var(--zz-mut);margin:2px 0 0}
.zz-card{border:1px solid var(--zz-line);background:var(--zz-card);border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:14px}
.zz-h2{font-size:17px;font-weight:600;margin:0}
.zz-p{font-size:14px;color:var(--zz-mut);margin:0}
.zz-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.zz-pill{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:550;padding:5px 12px;border-radius:999px;border:1px solid var(--zz-line);background:var(--zz-bg)}
.zz-dot{width:8px;height:8px;border-radius:50%;background:var(--zz-dim)}
.zz-pill[data-s=connected] .zz-dot{background:var(--zz-ok)}
.zz-pill[data-s=error] .zz-dot{background:var(--zz-err)}
.zz-pill[data-s=connecting] .zz-dot,.zz-pill[data-s=no-key] .zz-dot{background:var(--zz-warn)}
.zz-in{flex:1 1 280px;min-width:0;height:48px;padding:0 16px;font:inherit;font-size:15px;color:var(--zz-fg);background:var(--zz-bg);border:1px solid var(--zz-line);border-radius:12px;outline:none}
.zz-in:focus{border-color:var(--zz-fg)}
.zz-btn{height:48px;padding:0 22px;font:inherit;font-size:15px;font-weight:600;border-radius:12px;border:1px solid var(--zz-fg);background:var(--zz-fg);color:var(--zz-bg);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.zz-btn:disabled{opacity:.5;cursor:default}
.zz-btn.zz-2{background:transparent;color:var(--zz-fg);border-color:var(--zz-line)}
.zz-btn.zz-sm{height:38px;padding:0 16px;font-size:14px}
.zz-err{color:var(--zz-err);font-size:14px;margin:0}
.zz-ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
.zz-ul li{font-size:15px;padding:12px 16px;border:1px solid var(--zz-line);border-radius:12px;background:var(--zz-bg)}
.zz-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;margin:0;padding:0;list-style:none}
.zz-tools li{font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:8px 12px;border:1px solid var(--zz-line);border-radius:10px;background:var(--zz-bg);overflow-wrap:anywhere}
.zz a.zz-link{color:var(--zz-fg);text-decoration:underline;text-underline-offset:3px}
.zz details summary{cursor:pointer;font-size:15px;font-weight:600}
@media(max-width:560px){.zz-card{padding:18px}.zz-btn{width:100%;justify-content:center}}
`

    async function api(path, options) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), options?.timeout ?? 30000)
      try {
        const response = await fetch(API + path, {
          method: options?.body ? 'POST' : 'GET',
          headers: { 'content-type': 'application/json', 'x-ziztu-dsh': '1' },
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        })
        const json = await response.json().catch(() => ({}))
        if (!response.ok) throw Object.assign(new Error(json.error || 'error'), { status: response.status })
        return json
      } finally {
        clearTimeout(timer)
      }
    }

    function SettingsPage({ t, iconUrl }) {
      const [state, setState] = useState(null)
      const [key, setKey] = useState('')
      const [url, setUrl] = useState('')
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')

      const load = useCallback(() => api('/state').then(s => { setState(s); setUrl(s.url) }).catch(() => setError(t('errNet'))), [])
      useEffect(() => { load() }, [load])
      // While the plugin is still connecting, look again shortly.
      useEffect(() => {
        if (!state || (state.status !== 'connecting' && state.status !== 'idle')) return undefined
        const timer = setTimeout(load, 1500)
        return () => clearTimeout(timer)
      }, [state, load])

      const run = async (path, body) => {
        setBusy(true); setError('')
        try {
          const next = await api(path, { body: body ?? {}, timeout: 60000 })
          setState(next); setUrl(next.url); setKey('')
        } catch (e) {
          setError(e.status === 400 ? (e.message || t('errBad')) : t('errNet'))
        } finally { setBusy(false) }
      }

      const status = state?.status ?? 'idle'
      const label = { connected: t('s_connected'), connecting: t('s_connecting'), error: t('s_error'), 'no-key': t('s_nokey'), idle: t('s_idle') }[status] ?? t('s_idle')
      const asks = ['ask1', 'ask2', 'ask3', 'ask4', 'ask5']

      return h('div', { className: 'zz' },
        h('div', { className: 'zz-head' },
          iconUrl ? h('img', { className: 'zz-logo', src: iconUrl, alt: '' }) : null,
          h('div', null,
            h('h1', { className: 'zz-h1' }, t('title')),
            h('p', { className: 'zz-sub' }, t('sub')))),

        h('div', { className: 'zz-card' },
          h('div', { className: 'zz-row' },
            h('h2', { className: 'zz-h2' }, t('status')),
            h('span', { className: 'zz-pill', 'data-s': status },
              h('span', { className: 'zz-dot' }),
              status === 'connected' ? t('tools_ready').replace('{n}', String(state?.toolCount ?? 0)) : label)),
          status === 'error' && state?.message ? h('p', { className: 'zz-err' }, state.message) : null,
          h('h2', { className: 'zz-h2', style: { marginTop: 8 } }, t('keyTitle')),
          h('p', { className: 'zz-p' }, t('keyHelp')),
          h('div', { className: 'zz-row' },
            h('a', { className: 'zz-btn zz-2 zz-sm', href: KEY_PAGE, target: '_blank', rel: 'noopener noreferrer' }, t('getKey')),
            h('a', { className: 'zz-link', href: DOCS, target: '_blank', rel: 'noopener noreferrer', style: { fontSize: 14 } }, t('docs'))),
          h('form', {
            className: 'zz-row',
            onSubmit: e => { e.preventDefault(); if (key.trim()) run('/settings', { apiKey: key.trim() }) },
          },
            h('input', {
              className: 'zz-in', type: 'password', autoComplete: 'off', spellCheck: false,
              'aria-label': t('keyLabel'), placeholder: t('keyPlaceholder'), value: key, onChange: e => setKey(e.target.value),
            }),
            h('button', { className: 'zz-btn', type: 'submit', disabled: busy || !key.trim() }, busy ? t('saving') : t('save'))),
          state?.hasKey ? h('div', { className: 'zz-row' },
            h('span', { className: 'zz-p' }, state.keySource === 'settings' ? t('savedKey').replace('{end}', state.keyEnd) : t('fromEnv')),
            h('button', { className: 'zz-btn zz-2 zz-sm', type: 'button', disabled: busy, onClick: () => run('/reconnect') }, t('reconnect')),
            state.keySource === 'settings' ? h('button', { className: 'zz-btn zz-2 zz-sm', type: 'button', disabled: busy, onClick: () => run('/settings', { clearKey: true }) }, t('removeKey')) : null) : null,
          error ? h('p', { className: 'zz-err' }, error) : null,
          h('p', { className: 'zz-p' }, t('privacy'))),

        h('div', { className: 'zz-card' },
          h('h2', { className: 'zz-h2' }, t('askTitle')),
          h('ul', { className: 'zz-ul' }, asks.map(k => h('li', { key: k }, t(k))))),

        h('div', { className: 'zz-card' },
          h('h2', { className: 'zz-h2' }, t('safeTitle')),
          h('p', { className: 'zz-p' }, t('safe'))),

        h('div', { className: 'zz-card' },
          h('h2', { className: 'zz-h2' }, t('toolsTitle')),
          state?.tools?.length
            ? h('ul', { className: 'zz-tools' }, state.tools.map(tool => h('li', { key: tool.name, title: tool.description }, tool.name)))
            : h('p', { className: 'zz-p' }, t('toolsNone'))),

        h('details', { className: 'zz-card' },
          h('summary', null, t('adv')),
          h('p', { className: 'zz-p' }, t('advHelp')),
          h('form', { className: 'zz-row', onSubmit: e => { e.preventDefault(); run('/settings', { url }) } },
            h('input', { className: 'zz-in', value: url, spellCheck: false, 'aria-label': t('adv'), onChange: e => setUrl(e.target.value) }),
            h('button', { className: 'zz-btn zz-2', type: 'submit', disabled: busy }, t('advSave')))))
    }

    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }), 'ziztu: dictionaries')
      ctx.effect(() => {
        const style = document.createElement('style')
        style.setAttribute('data-plugin', 'dsh-plugin-ziztu')
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'ziztu: styles')
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'ziztu',
        order: 40,
        label: () => t('nav'),
        locale: NS,
      }, () => h(SettingsPage, { t, iconUrl: LOGO })))
    }

    exports.apply = apply
    exports.inject = inject
    exports.name = 'dsh-plugin-ziztu'
    exports.__test = { DICT }
    return module.exports
  },
})
