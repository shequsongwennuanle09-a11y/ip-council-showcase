(() => {
  'use strict';

  const KEY = 'ip-council-showcase-v3';
  const D = window.IP_DATA || { advisors: [], checks: [] };
  const UPGRADE_VIEWS = new Set(['diagnosis', 'studio', 'reviews']);
  const routeMap = {
    '定位': 'position', '用户': 'insight', '选题': 'topic', '表达': 'script',
    '执行': 'script', '获客': 'topic', '成交': 'growth', '证据与边界': 'review'
  };
  let reportPending = false;
  let csrf = '';

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const uid = () => globalThis.crypto?.randomUUID?.() || `u-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = () => new Date().toLocaleString('zh-CN', { hour12: false });
  const notify = message => {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('show'), 3500);
  };

  function readStore() {
    let store = null;
    try { store = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
    if (!store || !Array.isArray(store.projects) || !store.projects.length) {
      const profile = Object.fromEntries((D.profileFields || []).map(key => [key, key === 'stage' ? (D.stages?.[0] || '待确认') : key === 'goal' ? (D.goals?.[0] || '待确认') : '']));
      const p = { id: uid(), name: '我的第一个IP', profile: { ...profile, name: '我的第一个IP' }, onboarded: false, tasks: {}, checks: {}, feedback: {}, topics: [], artifacts: [] };
      store = { active: p.id, projects: [p], mode: 'standard', compact: false };
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
    }
    return store;
  }

  function writeStore(store) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); return true; }
    catch { notify('浏览器保存失败，请先导出项目备份。'); return false; }
  }

  function project() {
    const store = readStore();
    const p = store?.projects?.find(item => item.id === store.active) || store?.projects?.[0];
    if (!p) return null;
    if (!p.diagnosis) p.diagnosis = { layer: '待判断', issue: '', evidence: '', uncertainty: '', priority: '', nextAdvisor: 'chief', updatedAt: '' };
    if (!Array.isArray(p.works)) p.works = [];
    return { store, p };
  }

  function freshWork(seed = {}) {
    return {
      id: uid(), title: seed.title || '未命名作品', version: 'v1', status: '设计中', updatedAt: now(),
      targetUser: '', userState: '', purpose: seed.purpose || '曝光', desiredAction: '', signal: '',
      topic: seed.topic || '', solution: seed.solution || '', evidenceSource: '', mainVariable: '',
      brightLine: '', darkLine: '', visibleObject: '', realAction: '', props: '', proof: '', limits: '', alternative: '',
      experience: { music: '本条不用音乐，保留原声', light: '', imagery: '', rhythm: '', person: '' },
      shoot: { scale: '简单日常', location: '', scenePlan: '', direction: '', requiredAssets: '', audioPlan: '', mustKeepFacts: '', improv: '', boundary: '' },
      preflight: { purpose: false, opening: false, visible: false, line: false, facts: false, permission: false },
      review: { id: '', version: 'v1', change: '', releaseTime: '', observationWindow: '', dataSource: '', retention: '未知', comments: '未知', actions: '未知', originalQuote: '', observed: '', remembered: '', nextVariable: '', reason: '', savedAt: '' },
      reviews: []
    };
  }

  function activeWork(p, create = false) {
    let work = p?.works?.find(item => item.id === p.activeWorkId);
    if (!work && p?.works?.length) { work = p.works[0]; p.activeWorkId = work.id; }
    if (!work && create && p) { work = freshWork(); p.works.push(work); p.activeWorkId = work.id; }
    return work || null;
  }

  function advisors() {
    return D.advisors.length ? D.advisors : [{ id: 'chief', name: '总军师', mark: '统', job: '统筹方向与协作' }];
  }

  const workflowStages = [
    ['diagnosis', '01', '总军师诊断'],
    ['studio', '02', '作品设计与拍摄'],
    ['reviews', '03', '作品级复盘']
  ];
  function stagebar(view) {
    if (!UPGRADE_VIEWS.has(view)) return '';
    const index = workflowStages.findIndex(([id]) => id === view);
    const next = workflowStages[(index + 1) % workflowStages.length];
    return `<nav class="upgrade-stagebar" aria-label="作品生产线"><div class="upgrade-stage-items">${workflowStages.map(([id, number, label], itemIndex) => `<button class="upgrade-stage ${id === view ? 'is-active' : itemIndex < index ? 'is-done' : ''}" data-upgrade-view="${id}" ${id === view ? 'aria-current="step"' : ''}><b>${number}</b><span>${label}</span></button>`).join('<i aria-hidden="true">→</i>')}</div><button class="upgrade-next" data-upgrade-view="${next[0]}"><span>下一阶段</span><strong>${next[2]} ↗</strong></button></nav>`;
  }

  function heading(kicker, title, subtitle, action = '') {
    return `${stagebar(document.body.dataset.view)}<div class="page-heading upgrade-heading"><div><span class="eyebrow">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;
  }

  function pill(label, tone = '') { return `<span class="pill ${tone}">${esc(label)}</span>`; }
  function input(label, key, value, placeholder = '', type = 'text') {
    return `<label class="upgrade-field"><span>${esc(label)}</span><input type="${type}" data-work-field="${esc(key)}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
  }
  function area(label, key, value, placeholder = '') {
    return `<label class="upgrade-field upgrade-area"><span>${esc(label)}</span><textarea data-work-field="${esc(key)}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
  }
  function getAt(object, path) { return path.split('.').reduce((value, key) => value?.[key], object) ?? ''; }
  function setAt(object, path, value) {
    const keys = path.split('.');
    let target = object;
    keys.slice(0, -1).forEach(key => { if (!target[key] || typeof target[key] !== 'object') target[key] = {}; target = target[key]; });
    target[keys[keys.length - 1]] = value;
  }
  function saveCurrent(mutator) {
    const current = project();
    if (!current) return null;
    mutator(current.p, current.store);
    if (writeStore(current.store)) return current.p;
    return null;
  }

  function workTabs(p, active) {
    if (!p.works.length) return `<div class="upgrade-empty-inline">还没有作品工作包。点击“新建作品”开始，把这条内容从想法推进到可拍。</div>`;
    return `<div class="upgrade-work-tabs" role="tablist">${p.works.map(work => `<button type="button" class="upgrade-work-tab ${work.id === active?.id ? 'active' : ''}" data-work-select="${esc(work.id)}"><span>${esc(work.version || 'v1')}</span><strong>${esc(work.title || '未命名作品')}</strong><small>${esc(work.status || '设计中')}</small></button>`).join('')}</div>`;
  }

  function workProgress(work) {
    if (!work) return 0;
    const keys = ['title', 'targetUser', 'purpose', 'topic', 'solution', 'brightLine', 'darkLine', 'visibleObject', 'realAction', 'scenePlan', 'mustKeepFacts', 'boundary'];
    return Math.round(keys.filter(key => String(work[key] || '').trim()).length / keys.length * 100);
  }

  function diagnosticCard(p) {
    const d = p.diagnosis;
    const advisor = advisors().find(item => item.id === d.nextAdvisor) || advisors()[0];
    const summary = d.issue || '先记录一个正在发生的问题，再让总军师判断应该改哪一层。';
    return `<section class="upgrade-diagnostic-card"><div class="upgrade-card-top"><div><span class="eyebrow">CHIEF ROUTING / 当前诊断</span><h2>${esc(summary)}</h2></div>${pill(d.layer || '待判断', d.layer === '待判断' ? 'orange' : 'green')}</div><div class="upgrade-diagnostic-route"><span class="upgrade-route-number">${esc(advisor.mark || '统')}</span><div><strong>下一席：${esc(advisor.name)}</strong><small>${esc(advisor.job || '负责下一步专业交付')}</small></div><span class="upgrade-route-arrow">→</span></div><div class="upgrade-diagnostic-mini"><div><span>已有证据</span><strong>${esc(d.evidence || '待补充')}</strong></div><div><span>本轮优先动作</span><strong>${esc(d.priority || '待总军师给出')}</strong></div></div><button class="primary" data-upgrade-view="diagnosis">打开总军师诊断卡 ↗</button></section>`;
  }

  function diagnosis() {
    const current = project();
    const p = current?.p;
    if (!p) return '<section class="panel"><h2>项目资料暂不可用</h2></section>';
    const d = p.diagnosis;
    const advisor = advisors().find(item => item.id === d.nextAdvisor) || advisors()[0];
    const options = ['待判断', '定位', '用户', '选题', '表达', '执行', '获客', '成交', '证据与边界'];
    return heading('CHIEF DIAGNOSIS / 总军师', '先判断改哪一层，再开始制作。', '这是一张可修正的工作假设卡：保存证据、保留不确定，把唯一优先任务交给下一席。', '<button class="secondary" data-feature-report>导出作品执行报告 ↗</button>') + `<div class="upgrade-diagnosis-grid"><form id="diagnosis-form" class="panel upgrade-form"><div class="upgrade-form-header"><div><span class="eyebrow">01 / 问题分流</span><h2>这次真正卡住的是什么？</h2></div>${pill(p.onboarded ? '当前项目' : '资料待确认', p.onboarded ? 'green' : 'orange')}</div><label class="upgrade-field"><span>问题层</span><select data-diagnosis-field="layer">${options.map(option => `<option ${d.layer === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label><label class="upgrade-field upgrade-area"><span>当前问题 · 用你自己的话写</span><textarea data-diagnosis-field="issue" placeholder="例如：稿子能说清，但一到现场就很僵；或有人看，却没有合适的人来问。">${esc(d.issue)}</textarea></label><label class="upgrade-field upgrade-area"><span>已有证据</span><textarea data-diagnosis-field="evidence" placeholder="记录作品、用户原话、现场观察或数据来源；没有就写“尚未取得”。">${esc(d.evidence)}</textarea></label><label class="upgrade-field upgrade-area"><span>仍不确定的因素</span><textarea data-diagnosis-field="uncertainty" placeholder="不要把一次表现直接当成因果，例如：还不知道是开头、对象还是表达形式。">${esc(d.uncertainty)}</textarea></label><label class="upgrade-field upgrade-area"><span>本轮唯一优先动作</span><textarea data-diagnosis-field="priority" placeholder="例如：先补一张可带去拍摄的执行卡，而不是重新改定位。">${esc(d.priority)}</textarea></label><label class="upgrade-field"><span>下一席军师</span><select data-diagnosis-field="nextAdvisor">${advisors().map(item => `<option value="${esc(item.id)}" ${d.nextAdvisor === item.id ? 'selected' : ''}>${esc(item.name)} · ${esc(item.job || '')}</option>`).join('')}</select></label><div class="upgrade-form-actions"><small>总军师诊断不是一次性结论；有新证据时可以回到这里改写。</small><button class="primary" type="submit">保存诊断卡 ↗</button></div></form><aside class="upgrade-diagnosis-aside"><section class="panel upgrade-route-card"><span class="eyebrow">02 / 条件路由</span><h2>现在交给谁？</h2><div class="upgrade-route-emphasis"><span>${esc(advisor.mark || '统')}</span><div><strong>${esc(advisor.name)}</strong><p>${esc(advisor.question || advisor.job || '负责下一步交付')}</p></div></div><p class="upgrade-muted">总军师只保留一个下一步，不把八位军师的意见同时压给你。后续交付会写入作品工作包。</p><button class="secondary" data-view="council" data-ask="${esc(d.nextAdvisor || 'chief')}">进入${esc(advisor.name)}席位 ↗</button></section><section class="panel upgrade-principle-card"><span class="eyebrow">03 / 判断边界</span><h3>先分清问题，不急着换赛道。</h3><ul><li>低流量不自动等于定位错。</li><li>有点赞不等于产生合适行动。</li><li>没有成片，不把文稿分析叫成片检查。</li><li>证据不足时，下一步是记录动作。</li></ul></section></aside></div>`;
  }

  function studio() {
    const current = project();
    const p = current?.p;
    if (!p) return '<section class="panel"><h2>项目资料暂不可用</h2></section>';
    const work = activeWork(p, true);
    const selectedTopic = p.topics?.find(item => item.title === work.topic);
    const experience = work.experience || {};
    const shoot = work.shoot || {};
    const action = `<span class="upgrade-actions-inline"><button class="secondary" data-new-work>新建作品</button><button class="secondary" data-feature-report>导出作品执行报告 ↗</button></span>`;
    return heading('WORK PACKAGE / 作品设计', '把一条内容，变成带得走的拍摄卡。', '先设计观众看见什么，再安排说什么、做什么、拍什么。五维体验允许本条不用，现场即兴也要有边界。', action) + `<section class="upgrade-workbar"><div><span class="eyebrow">当前项目 · ${esc(p.name)}</span><h2>作品工作包 <small>${p.works.length} 份</small></h2></div><div class="upgrade-progress"><strong>${workProgress(work)}%</strong><span>核心字段已补</span><div><i style="width:${workProgress(work)}%"></i></div></div></section>${workTabs(p, work)}<form id="studio-form" class="upgrade-studio-form"><input type="hidden" data-work-field="id" value="${esc(work.id)}"><section class="panel upgrade-section"><div class="upgrade-section-title"><span class="eyebrow">01 / 目的与证据</span><h2>这条作品推动什么？</h2><p>目的、对象、解法和证据先对齐，避免把一条内容同时塞进所有任务。</p></div><div class="upgrade-fields-grid">${input('作品名称', 'title', work.title, '例如：让新手看懂第一步怎么做')}${input('版本', 'version', work.version, 'v1')}${input('目标用户', 'targetUser', work.targetUser, '一个具体的人，而不是所有人')}${input('用户当前状态', 'userState', work.userState, '他现在正在做什么、卡在哪一步？')}<label class="upgrade-field"><span>唯一主目的</span><select data-work-field="purpose">${['曝光', '获客', '成交', '人设'].map(item => `<option ${work.purpose === item ? 'selected' : ''}>${item}</option>`).join('')}</select></label>${input('希望发生的一个动作', 'desiredAction', work.desiredAction, '看懂、收藏、提问或进一步了解')}${input('可以观察的信号', 'signal', work.signal, '真实原话、停留、问询或实际行动')}${input('主要变量', 'mainVariable', work.mainVariable, '这次只想验证哪一个因素？')}</div><div class="upgrade-fields-grid">${area('选题 / 核心问题', 'topic', work.topic, '这条具体要解决什么小问题？')}${area('解法 / 讲法', 'solution', work.solution, '你能用什么真实过程、判断或动作帮助他？')}${area('证据来源', 'evidenceSource', work.evidenceSource, '本人经历、公开过程、用户原话、演示示意……')}${area('不适用条件', 'limits', work.limits, '什么情况下不能把这套讲法当成结论？')}</div>${selectedTopic ? `<div class="notice green">已关联选题卡：${esc(selectedTopic.title)} · ${esc(selectedTopic.purpose)}。仍需你确认这份工作包。</div>` : ''}</section><section class="panel upgrade-section"><div class="upgrade-section-title"><span class="eyebrow">02 / 明线与暗线</span><h2>让观众看见一件事，也感受到一个人。</h2><p>明线是发生了什么、理解了什么；暗线是希望观众感受到怎样的关系、气质与状态。</p></div><div class="upgrade-fields-grid">${area('明线 · 观众将看见 / 理解什么', 'brightLine', work.brightLine, '例如：看见我按三个顺序判断一个问题')}${area('暗线 · 观众希望感受到什么', 'darkLine', work.darkLine, '例如：安静、可信、像有人陪着一起拆问题')}${area('观看对象', 'visibleObject', work.visibleObject, '真实物件、动作、过程、变化或对照')}${area('真实动作', 'realAction', work.realAction, '镜头里实际做什么，不只对镜头说')}${area('道具 / 素材', 'props', work.props, '现成资源、授权状态与成本条件')}${area('它能证明什么', 'proof', work.proof, '它支持哪一个判断？不要把演示当客户成果')}${area('它不能证明什么', 'limits', work.limits, '明确证据边界，避免过度承诺')}${area('不适配时的替代', 'alternative', work.alternative, '没有场地或道具时的低成本方案')}</div></section><section class="panel upgrade-section"><div class="upgrade-section-title"><span class="eyebrow">03 / 五维体验</span><h2>每一项都可以选择“不用”。</h2><p>体验服务于这条内容的感觉，不默认热门音乐、强光、快剪或夸张情绪。</p></div><div class="upgrade-experience-grid">${area('音乐 · 何时进入 / 是否不用', 'experience.music', experience.music, '例如：前3秒无音乐，动作开始后轻入；或本条不用')}${area('光影 / 空间', 'experience.light', experience.light, '写真实空间里的明暗、冷暖、纵深与可用光')}${area('意象 / 物件', 'experience.imagery', experience.imagery, '哪个真实物件承载目标感觉，为什么适配')}${area('节奏', 'experience.rhythm', experience.rhythm, '哪里停顿、转动作、展示重点或让原声接管')}${area('人物状态', 'experience.person', experience.person, '对谁说、距离、关系与自然状态')}</div></section><section class="panel upgrade-section"><div class="upgrade-section-title"><span class="eyebrow">04 / 现场执行</span><h2>到现场，照着做，也知道哪里可以变。</h2><p>简单日常不必拍成大型访谈；复杂作品先有兜底主线，再在真实空间里获得细节。</p></div><div class="upgrade-fields-grid">${input('制作规模', 'shoot.scale', shoot.scale, '简单日常 / 复杂作品')}${input('场景 / 空间', 'shoot.location', shoot.location, '现成可用空间，不默认买器材')}${area('场景顺序', 'shoot.scenePlan', shoot.scenePlan, '01 场景：说什么 / 做什么 / 拍什么\n02 场景：……')}${area('现场引导', 'shoot.direction', shoot.direction, '给自己或对话对象的提问、动作提示与兜底主线')}${area('必须具备的素材', 'shoot.requiredAssets', shoot.requiredAssets, '拍摄前要确认的道具、授权、原声或资料')}${area('原声与音乐计划', 'shoot.audioPlan', shoot.audioPlan, '哪里保留原声，哪里进入音乐；未授权音乐不默认可用')}${area('必须保留的事实', 'shoot.mustKeepFacts', shoot.mustKeepFacts, '姓名、时间、过程、条件与适用范围等')}${area('现场可以自由变化的地方', 'shoot.improv', shoot.improv, '真实空间、语气、停顿、对话细节；不改事实')}${area('公开 / 授权 / 安全边界', 'shoot.boundary', shoot.boundary || p.profile.boundary, '不能公开什么、哪些内容需人工确认')}</div><div class="upgrade-form-actions"><small>工作包只写入当前项目本机存储；保存后可在作品级复盘中记录版本和反馈。</small><button class="primary" type="submit">保存作品工作包 ↗</button></div></section></form>`;
  }

  function reviews() {
    const current = project();
    const p = current?.p;
    if (!p) return '<section class="panel"><h2>项目资料暂不可用</h2></section>';
    const work = activeWork(p, false);
    if (!work) return heading('WORK REVIEW / 作品复盘', '先有一份作品工作包。', '复盘必须关联作品、版本、原目的和观察窗口，不把点赞直接当成交。', '<button class="primary" data-upgrade-view="studio">创建作品工作包 ↗</button>');
    const r = work.review || freshWork().review;
    const checks = [
      ['purpose', '开头与正文兑现同一个主目的'], ['opening', '目标人群能识别自己与当前问题'], ['visible', '抽象信息已经变成可观看对象或动作'],
      ['line', '明线、暗线与五维体验没有冲突'], ['facts', '事实、素材授权与承诺边界成立'], ['permission', '现场可公开区域与他人信息已确认']
    ];
    return heading('WORK REVIEW / 作品级复盘', '不只看数据，复盘这条作品发生了什么。', '先做发布前检查，再在观察窗口内记录真实信号。下一版只改一个关键变量，并保留未知、未取得和0的区别。', '<button class="primary" data-feature-report>生成作品执行报告 ↗</button>') + `<section class="upgrade-workbar"><div><span class="eyebrow">当前作品</span><h2>${esc(work.title)} <small>${esc(work.version)}</small></h2></div><div class="upgrade-workbar-actions"><button class="secondary" data-upgrade-view="studio">回到作品工作台</button><button class="secondary" data-new-work>新建作品</button></div></section>${workTabs(p, work)}<div class="upgrade-review-grid"><form id="review-form" class="panel upgrade-form"><div class="upgrade-form-header"><div><span class="eyebrow">01 / 发布前检查</span><h2>先确认能不能带去拍。</h2></div>${pill(`${Object.values(work.preflight || {}).filter(Boolean).length}/${checks.length}`, 'orange')}</div><div class="upgrade-checklist">${checks.map(([key, label]) => `<label class="upgrade-check"><input type="checkbox" data-preflight="${key}" ${work.preflight?.[key] ? 'checked' : ''}><span>${esc(label)}</span><small>${key === 'facts' ? '事实、音乐、素材授权与适用条件仍需人工确认' : '保存为当前作品版本的发布前记录'}</small></label>`).join('')}</div><div class="upgrade-section-title upgrade-review-title"><span class="eyebrow">02 / 发布后观察</span><h2>把表现放回原目的。</h2></div><div class="upgrade-fields-grid">${input('作品版本', 'version', r.version || work.version, 'v1')}${input('本次改动', 'change', r.change, '相较上一版只改了什么？')}${input('发布时间', 'releaseTime', r.releaseTime, 'YYYY-MM-DD HH:mm')}${input('观察窗口', 'observationWindow', r.observationWindow, '例如发布后48小时')}${input('数据 / 反馈来源', 'dataSource', r.dataSource, '平台后台、私信、访谈、本人观察……')}${input('平均观看 / 停留', 'retention', r.retention, '未知 / 未取得 / 0 / 具体值')}${input('目标用户回应', 'comments', r.comments, '未知 / 未取得 / 0 / 具体值')}${input('符合目的的行动', 'actions', r.actions, '未知 / 未取得 / 0 / 具体值')}</div>${area('真实原话', 'originalQuote', r.originalQuote, '脱敏记录用户原话；没有就写“尚未取得”')}${area('哪里集中流失 / 提问 / 误解', 'observed', r.observed, '只记录观察到的事实，不直接宣布原因')}${area('观众记住了什么人设或判断', 'remembered', r.remembered, '如果没有证据，保留“未知”')}${area('下一版只改的关键因素', 'nextVariable', r.nextVariable, '例如只改开头兑现，不同时换音乐和光线')}${area('为什么改这个因素', 'reason', r.reason, '根据哪条证据或限制提出？仍可能只是待验证假设')}<div class="upgrade-form-actions"><small>保存会保留一个作品级版本记录；再次保存不会覆盖历史复盘。</small><button class="primary" type="submit">保存这次复盘 ↗</button></div></form><aside class="upgrade-review-aside"><section class="panel"><span class="eyebrow">当前作品摘要</span><h3>${esc(work.brightLine || '明线待补充')}</h3><p>${esc(work.darkLine || '暗线待补充')}</p><div class="upgrade-summary-list"><div><span>主目的</span><strong>${esc(work.purpose)}</strong></div><div><span>目标用户</span><strong>${esc(work.targetUser || '待补充')}</strong></div><div><span>主要变量</span><strong>${esc(work.mainVariable || '待补充')}</strong></div></div></section><section class="panel"><span class="eyebrow">历史版本</span>${work.reviews?.length ? `<ol class="upgrade-history">${work.reviews.slice(0, 8).map(item => `<li><strong>${esc(item.version || '未命名版本')}</strong><span>${esc(item.savedAt || '未记录')}</span><p>${esc(item.nextVariable || item.change || '本次未记录修改变量')}</p></li>`).join('')}</ol>` : '<p class="upgrade-muted">还没有复盘记录。作品发布后再回来，先记事实，再做解释。</p>'}</section></aside></div>`;
  }

  function renderUpgrade(view, updateHash = true) {
    if (!UPGRADE_VIEWS.has(view)) return;
    const workspace = $('#workspace');
    if (!workspace) return;
    const current = project();
    if (!current) return;
    document.body.dataset.view = view;
    if (view === 'studio') activeWork(current.p, true);
    if (view === 'reviews') activeWork(current.p, false);
    if (view === 'studio' || view === 'reviews') writeStore(current.store);
    workspace.innerHTML = view === 'diagnosis' ? diagnosis() : view === 'studio' ? studio() : reviews();
    document.body.dataset.view = view;
    const titles = { diagnosis: '总军师诊断卡', studio: '作品设计与拍摄工作台', reviews: '作品级复盘' };
    const breadcrumb = $('#breadcrumb'); if (breadcrumb) breadcrumb.textContent = titles[view];
    document.title = titles[view] + ' · 个人IP打造军师团';
    document.querySelectorAll('.nav-item').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    if (updateHash && location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function featureDialog(kicker, html) {
    const dialog = $('#detail-dialog');
    if (!dialog) return;
    $('#dialog-kicker').textContent = kicker;
    $('#dialog-content').innerHTML = html;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  function openReport(){
    featureDialog('展示版能力边界','<h2 id="dialog-title">作品PDF需要完整版后台。</h2><p>当前仅展示作品设计、拍摄卡与复盘界面，不请求服务器、不生成模拟报告。</p><p>你可以在本浏览器填写并保存作品记录。</p><button class="secondary" data-upgrade-close>继续浏览</button>');
  }
  async function getCsrf(){throw new Error('静态展示版不请求后台。');}
  function reportPayload(form) {
    const current = project();
    const p = current.p;
    const work = activeWork(p, false);
    const includeProfile = form.querySelector('[name="includeProfile"]')?.checked !== false;
    const includeReview = form.querySelector('[name="includeReview"]')?.checked !== false;
    return {
      workspaceId: p.id,
      profileMode: includeProfile && p.onboarded ? 'confirmed' : 'draft',
      includeSaved: false, includeCurrent: false, includeWork: true,
      featureDiagnosis: p.diagnosis,
      featureWork: includeReview ? work : { ...work, reviews: [], review: { ...work.review, savedAt: '' } },
      project: { id: p.id, name: p.name, onboarded: p.onboarded, profile: { ...p.profile }, artifacts: [], topics: p.topics || [], tasks: p.tasks || {}, checks: p.checks || {}, feedback: p.feedback || {} }
    };
  }

  async function exportFeatureReport(form){notify('公开展示版不提供服务器PDF下载。');}
  function saveDiagnosis(form) {
    const values = {};
    form.querySelectorAll('[data-diagnosis-field]').forEach(field => { values[field.dataset.diagnosisField] = field.value; });
    saveCurrent(p => { p.diagnosis = { ...p.diagnosis, ...values, updatedAt: now() }; });
    notify('总军师诊断卡已保存，下一席路由已更新。');
    renderUpgrade('diagnosis', false);
  }

  function saveStudio(form) {
    const current = project();
    const p = current.p;
    const work = activeWork(p, false);
    if (!work) return;
    form.querySelectorAll('[data-work-field]').forEach(field => {
      if (field.dataset.workField === 'id') return;
      setAt(work, field.dataset.workField, field.value);
    });
    work.updatedAt = now();
    work.status = workProgress(work) >= 80 ? '可带去拍摄' : '设计中';
    writeStore(current.store);
    notify('作品工作包已保存，可继续做发布前检查。');
    renderUpgrade('studio', false);
  }

  function saveReview(form) {
    const current = project();
    const p = current.p;
    const work = activeWork(p, false);
    if (!work) return;
    work.preflight = work.preflight || {};
    form.querySelectorAll('[data-preflight]').forEach(field => { work.preflight[field.dataset.preflight] = field.checked; });
    const review = { ...(work.review || {}), id: uid(), savedAt: now() };
    form.querySelectorAll('[data-review-field], [data-work-field]').forEach(field => {
      const key = field.dataset.reviewField || field.dataset.workField;
      if (key && key !== 'id') review[key] = field.value;
    });
    work.review = review;
    if (!Array.isArray(work.reviews)) work.reviews = [];
    work.reviews.unshift({ ...review, preflight: { ...work.preflight } });
    work.reviews = work.reviews.slice(0, 20);
    work.updatedAt = now();
    work.status = '已复盘，待下一版';
    writeStore(current.store);
    notify('作品级复盘已保存，历史版本已保留。');
    renderUpgrade('reviews', false);
  }

  function createWork() {
    const current = project();
    if (!current) return;
    if (current.p.works.length >= 20) { notify('当前项目最多保留20份作品工作包，请先导出备份。'); return; }
    const seedTopic = current.p.topics?.[0];
    const work = freshWork(seedTopic ? { title: seedTopic.title, purpose: seedTopic.purpose, topic: seedTopic.title, solution: seedTopic.solution } : {});
    current.p.works.unshift(work); current.p.activeWorkId = work.id; writeStore(current.store); renderUpgrade('studio'); notify('已新建一份作品工作包。');
  }

  function selectWork(id) {
    const current = project();
    if (!current?.p.works?.some(work => work.id === id)) return;
    current.p.activeWorkId = id; writeStore(current.store);
    renderUpgrade(document.body.dataset.view === 'reviews' ? 'reviews' : 'studio', false);
  }

  function addLaunchpad() {
    if (document.body.dataset.view !== 'home') return;
    const categories = $('.store-categories');
    if (!categories || $('#upgrade-launchpad')) return;
    categories.insertAdjacentHTML('afterend', `<section id="upgrade-launchpad" class="upgrade-launchpad"><div class="upgrade-launchpad-head"><div><span class="eyebrow">V3 / WORKFLOW UPGRADE</span><h2>从“会聊”到“能拍、能复盘”。</h2><p>三张卡，把判断、制作和反馈接成一条创作生产线。</p></div><span class="upgrade-launchpad-stamp">P0</span></div><div class="upgrade-launchpad-grid"><button class="upgrade-launch-card" data-upgrade-view="diagnosis"><span>01</span><strong>总军师诊断卡</strong><small>先判断改哪一层，再路由下一席。</small><b>打开诊断 ↗</b></button><button class="upgrade-launch-card" data-upgrade-view="studio"><span>02</span><strong>作品设计与拍摄</strong><small>明暗线、观看对象、五维体验与现场执行。</small><b>开始做作品 ↗</b></button><button class="upgrade-launch-card" data-upgrade-view="reviews"><span>03</span><strong>作品级复盘与报告</strong><small>按作品、版本、变量和观察窗口保留证据。</small><b>查看复盘 ↗</b></button></div></section>`);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button,a');
    if (!button) return;
    const upgradeView = button.dataset.upgradeView || (UPGRADE_VIEWS.has(button.dataset.view) ? button.dataset.view : '');
    if (upgradeView) { event.preventDefault(); renderUpgrade(upgradeView); return; }
    if (button.dataset.newWork !== undefined) { event.preventDefault(); createWork(); return; }
    if (button.dataset.workSelect) { event.preventDefault(); selectWork(button.dataset.workSelect); return; }
    if (button.dataset.featureReport !== undefined) { event.preventDefault(); openReport(); return; }
    if (button.dataset.upgradeClose !== undefined) { $('#detail-dialog')?.close(); return; }
  });

  document.addEventListener('submit', event => {
    if (event.target.id === 'diagnosis-form') { event.preventDefault(); saveDiagnosis(event.target); }
    if (event.target.id === 'studio-form') { event.preventDefault(); saveStudio(event.target); }
    if (event.target.id === 'review-form') { event.preventDefault(); saveReview(event.target); }
    if (event.target.id === 'upgrade-report-form') { event.preventDefault(); exportFeatureReport(event.target); }
  });

  const workspace = $('#workspace');
  if (workspace) new MutationObserver(addLaunchpad).observe(workspace, { childList: true });
  window.addEventListener('hashchange', () => {
    const view = location.hash.slice(1);
    if (UPGRADE_VIEWS.has(view)) renderUpgrade(view, false);
  });
  addLaunchpad();
  if (UPGRADE_VIEWS.has(location.hash.slice(1))) renderUpgrade(location.hash.slice(1), false);
})();
