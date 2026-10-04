import type { ArtifactId, GameState, PlanId, SceneId } from './state';

export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
}

export interface SceneContent {
  title: string;
  kicker: string;
  goal: string;
  lines: DialogueLine[];
}

/** The authored report is shared by the dialogue and the inspection controls. */
export const INSPECTION_REPORT = {
  displacement: 0.04,
  displacementTolerance: 0.10,
  temperature: 21.6,
  temperatureMin: 18,
  temperatureMax: 26,
} as const;

/** All visible facts are authored here. An old drawing never fills an adult form. */
export const PLAN_OPTIONS: Record<PlanId, {
  title: string;
  destination: string;
  duration: string;
  duties: string;
  returnPolicy: string;
  communication: string;
  description: string;
}> = {
  long_voyage: {
    title: '加入长程观测航段',
    destination: '地月 L2 观测泊位',
    duration: '计划 9 日转移＋21 日观测；含返航窗口约 6 周离站。',
    duties: '加入已有的值班团队，轮班记录镜面与恒星观测数据。其他成员已独立确认参与。',
    returnPolicy: '申请处理前可撤回。出发前再确认适航与个人意愿；途中按批准的返航窗口返回，不是随时下船。',
    communication: '文字消息按通信窗口收发，通话需预约；可能有等待与中断。',
    description: '先抵达地月 L2，完成观测后返站。这是有限的观测航段，今天只做第一段出发准备。',
  },
  short_trial: {
    title: '参加近程试航',
    destination: '近地轨道试航环线',
    duration: '计划 36 小时；经过两个观测段后按窗口返站。',
    duties: '与试航团队核对舱内设备，亲自观察一次镜面展开；无需随后加入长程。',
    returnPolicy: '申请处理前可撤回。试航中可提出中止，由团队按安全窗口返站；没有后续航段义务。',
    communication: '离站后按窗口收发消息，预计返站后再通话；不保证即时联系。',
    description: '这是一项完整的近程任务。有自己的观察目标、轮班与返程安排。',
  },
  not_now: {
    title: '本次暂不加入',
    destination: '青川地面港 · 本次返程',
    duration: '完成本次验收，与父亲乘已确认的返程交通舱回家。',
    duties: '交付今天的验收记录。后续试航由原有团队继续，不留下欠缺的岗位等你。',
    returnPolicy: '本次不提交参与申请，没有未来报名日期，也没有必须再来的承诺。',
    communication: '可以单独选择保存项目公开联系方式；保存联系人不等于报名。',
    description: '现在的生活也是一个有效选择。旧图仍归你，与是否参与项目无关。',
  },
};

export const ARTIFACTS: Record<ArtifactId, { title: string; text: string[] }> = {
  drawing: {
    title: '折叠的旧航线册',
    text: [
      '老纸从工具箱夹袋取出，边缘已经起毛。折起的纸面上可读到「会下雨的星球」「能看见三个月亮的地方」。',
      '粗铅笔的笔画有深有浅。细黑笔写的是后来查到的真实项目条件，笔迹明显不同。',
      '内折还没有展开。背面露出一小截歪斜的船头和一个方形工具箱；继续摊开的是这一张纸。',
    ],
  },
  ticket: {
    title: '父亲的真实返程票',
    text: [
      '乘客：陈建平。已确认，非候补。',
      '航段：轨道站港 → 青川地面港。星期六 16:20 发车，目的地为地面居住地。',
      '陈建平的退休交接完成后按这张票回家；这不是远航舱位，也没有陈遥的代签申请。',
    ],
  },
  application: {
    title: '尚未填写的参与申请',
    text: [
      '姓名：空白。成年计划：空白。本人确认：空白。',
      '陈遥具备项目要求的工程与飞行资质，但具备资质不等于同意参加。',
      '只有本人重新填写并确认后，协调员才处理申请。父亲没有替他填表、签字或预订必须兑现的舱位。',
    ],
  },
  retirement: {
    title: '父亲的退休便笺',
    text: [
      '交接工具，带走旧照片；把站上借来的保温杯还回去。',
      '回家先试走楼下刚修好的那段路。周二去社区修理角，答应给老周的收音机换旋钮。',
      '窗台种葱，少浇一点水。最后一条被划过一次，又重新写上了。',
      '这些是陈建平自己的安排，不以陈遥是否参加试航为条件。',
    ],
  },
  conditions: {
    title: '已有项目与参与条件',
    text: [
      '退役镜面的一部分转入多年筹备的航行试验。主结构、资源和团队已经存在；今天的有限验收不是从零造一艘船。',
      `${PLAN_OPTIONS.long_voyage.title}：${PLAN_OPTIONS.long_voyage.duration} ${PLAN_OPTIONS.long_voyage.returnPolicy}`,
      `${PLAN_OPTIONS.short_trial.title}：${PLAN_OPTIONS.short_trial.duration} ${PLAN_OPTIONS.short_trial.returnPolicy}`,
      `${PLAN_OPTIONS.not_now.title}：${PLAN_OPTIONS.not_now.returnPolicy} 后续项目由其他成员继续。`,
      '通信按窗口进行。选择会影响自己的生活与工作安排，没有好感分数或最佳结局。',
    ],
  },
};

export const DRAWING_TRANSCRIPT = [
  '歪歪的船头旁：「会下雨的星球」。另一边：「能看见三个月亮的地方」。',
  '驾驶位置旁，童年的粗铅笔字：「我当船长」。',
  '方形工具箱旁，同一种铅笔字：「爸爸修船」。',
  '纸页下沿：「星期六出发」。',
  '父亲当年用细笔补在灯旁的一句：「先装灯」。',
  '后来标上的真实航段没有盖住这些字。这是陈遥的旧画，不是一份成年申请。',
];

export const CHILDHOOD_OPTIONS: Record<'rain' | 'threeMoons', { title: string; response: string }> = {
  rain: {
    title: '会下雨的星球',
    response: '小陈遥：去会下雨的星球！陈建平：那雨衣得带上。船长，你这纸箱可不防水。',
  },
  threeMoons: {
    title: '能看见三个月亮的地方',
    response: '小陈遥：去有三个月亮的地方！陈建平：那得给窗户擦干净。三个，可不能漏看一个。',
  },
};

export const SCENES: Record<SceneId, SceneContent> = {
  S01: {
    title: '先把包放下',
    kicker: 'S01 · 返站 / 停靠通道',
    goal: '放好包或收起工作终端，查看这次有限验收的范围，打开父亲的工具箱。夹袋里的票与申请表现在就能读。',
    lines: [
      { id: 'S01-01', speaker: '陈建平', text: '先把包放下。' },
      { id: 'S01-02', speaker: '陈遥', text: '我把这两行回完。' },
      { id: 'S01-03', speaker: '陈建平', text: '你从门那头走到这儿，一直是这两行。' },
      { id: 'S01-04', speaker: '陈遥', text: '你真准备去？' },
      { id: 'S01-05', speaker: '陈建平', text: '你先看完再说。我退休的手续都办了，剩下这几处交清楚。' },
      { id: 'S01-06', speaker: '终端', text: '本次权限：读取自动维护报告、移接检修灯、核验舱内固定点。路线仅含维修廊、储物台、观景舱与控制台。' },
    ],
  },
  S02: {
    title: '留面子又不能校准',
    kicker: 'S02 · 镜面背面 / 维修廊',
    goal: '读出报告上的单位与容差，再按标识把检修灯接到 P2。自动维护已正常完成校准，验收核对无需抢修。',
    lines: [
      { id: 'S02-01', speaker: '陈建平', text: '以前这一步得先——' },
      { id: 'S02-02', speaker: '自动维护单元', text: `校准完成。镜面偏差 ${INSPECTION_REPORT.displacement.toFixed(2)} mrad，容差不大于 ${INSPECTION_REPORT.displacementTolerance.toFixed(2)} mrad；温度 ${INSPECTION_REPORT.temperature} °C，允许区间 ${INSPECTION_REPORT.temperatureMin}–${INSPECTION_REPORT.temperatureMax} °C。两项正常。` },
      { id: 'S02-03', speaker: '陈遥', text: '它倒是没给你留面子。' },
      { id: 'S02-04', speaker: '陈建平', text: '留面子又不能校准。少让人出来冻着，挺好。' },
      { id: 'S02-05', speaker: '陈建平', text: '旧灯线从栏杆里过。新检修位在 P2，标牌和自动系统的图都指着那儿。扳手拿稳。' },
      { id: 'S02-06', speaker: '陈遥', text: '我早就会了。……知道，拿稳。' },
    ],
  },
  S03: {
    title: '名字起得真随便',
    kicker: 'S03 · 储物柜 / 同一张旧纸',
    goal: '看看父亲要带回家的日常物件，把旧航线册平放并打开外折。可以现在说出你的推断。',
    lines: [
      { id: 'S03-01', speaker: '陈建平', text: '这些带回去。站上的杯子留下，照片带走。你帮我按住这边，纸容易卷。' },
      { id: 'S03-02', speaker: '陈遥', text: '会下雨的星球……能看见三个月亮的地方。这都是什么航点？' },
      { id: 'S03-03', speaker: '陈建平', text: '起名字的人当时挺认真。' },
      { id: 'S03-04', speaker: '陈遥', text: '字有粗有细。黑笔写的是真实航段，铅笔写的不像技术地名。' },
      { id: 'S03-05', speaker: '陈建平', text: '很早以前的。先别弄散了，内折下面还有字。' },
      { id: 'S03-06', speaker: '陈遥', text: '你连回程都订好了？' },
      { id: 'S03-07', speaker: '陈建平', text: '不订，到时候又要等。回青川，楼下那条路刚修好。' },
    ],
  },
  S04: {
    title: '你想去哪',
    kicker: 'S04 · 观景舱 / 项目说明',
    goal: '读完三种安排及其生活影响。这里仍是空白申请，只了解条件，不会替你报名。',
    lines: [
      { id: 'S04-01', speaker: '陈遥', text: '你要去的话，这边比后面的工作舱舒服。' },
      { id: 'S04-02', speaker: '陈建平', text: '我不住这里。项目缺的也不是我这种岗位了。你呢，你想去哪？' },
      { id: 'S04-03', speaker: '许棠 · 字幕通话', text: '陈遥，你的资质已经核对。可以加入长程观测、参加近程试航，或只完成这次验收。你父亲没替你填，现在这里是空的。' },
      { id: 'S04-04', speaker: '许棠 · 字幕通话', text: '长程是到地月 L2 的有限航段，近程有自己的完整任务。提交前能撤回，出发后返程要服从安全窗口；通信也可能需要等。请把这些一起看。' },
      { id: 'S04-05', speaker: '陈遥', text: '我以为我是来帮你完成这件事的。' },
      { id: 'S04-06', speaker: '陈建平', text: '验收确实得你帮忙。别的，等你看完那张图。' },
    ],
  },
  S05: {
    title: '把内折摊开',
    kicker: 'S05 · 储物工作台 / 旧画',
    goal: '逐步打开同一张纸的内折。读船长座位、工具箱旁和下沿的原字；无需拖拽，也不会生成另一份证据。',
    lines: [
      { id: 'S05-01', speaker: '陈建平', text: '这一折慢一点。铅笔没褪多少，纸倒比以前脆。' },
      { id: 'S05-02', speaker: '陈遥', text: '船头、窗户……这里还有一只工具箱。' },
      { id: 'S05-03', speaker: '陈建平', text: '那时候你说，修船的人也得有座位，不能一路站着。' },
      { id: 'S05-04', speaker: '旁白', text: '下沿原来一直折在里面。把它摊平，纸上的灯和维修廊那盏灯隔着许多年，落在同一侧。' },
    ],
  },
  CHILDHOOD: {
    title: '先装灯',
    kicker: '童年片段 · 纸箱船',
    goal: '把小手电放进纸箱船头，亲手点亮它，再选当时想去的地方。这次选择只记录童年的想象。',
    lines: [
      { id: 'CHILDHOOD-01', speaker: '旁白', text: '这是童年的一个下午。船是搬家纸箱，窗是剪出来的洞，星空是桌下暗下去的房间。' },
      { id: 'CHILDHOOD-02', speaker: '小陈遥', text: '爸爸修船，我当船长。' },
      { id: 'CHILDHOOD-03', speaker: '陈建平', text: '先装灯。你把这只小手电放船头，手能碰到开关的地方。' },
      { id: 'CHILDHOOD-04', speaker: '小陈遥', text: '星期六出发。周一到周五你要上班。' },
      { id: 'CHILDHOOD-05', speaker: '陈建平', text: '好，船长。灯亮了以后，往哪儿？' },
    ],
  },
  S05_TRUTH: {
    title: '船还能开的时候',
    kicker: 'S05 · 回到现在 / 邀请',
    goal: '听完父亲的话。纸箱早已不在，旧画还在；空白申请仍等着成年后的你。',
    lines: [
      { id: 'S05T-01', speaker: '陈遥', text: '……这是我画的。我都忘了。' },
      { id: 'S05T-02', speaker: '陈建平', text: '你说周一到周五我要上班，所以只能星期六。我收工具的时候又看见了。' },
      { id: 'S05T-03', speaker: '陈遥', text: '所以你叫我回来……' },
      { id: 'S05T-04', speaker: '陈建平', text: '我没打算替你报名。现在不想去了，也行。' },
      { id: 'S05T-05', speaker: '陈建平', text: '我就是觉得，船还能开的时候，应该告诉你一声。' },
      { id: 'S05T-06', speaker: '旁白', text: '他把终端转向你。姓名和本人确认两栏都空着。旧画压在旁边，没有盖住表格。你们暂时都没有说话。' },
    ],
  },
  S06: {
    title: '这次由我来写',
    kicker: 'S06 · 控制台 / 成年计划',
    goal: '核验最后一个固定点。重新选择成年计划、亲自填写当前目的地，再阅读条件并明确确认。旧画不会代填。',
    lines: [
      { id: 'S06-01', speaker: '陈遥', text: '你真的想回家？' },
      { id: 'S06-02', speaker: '陈建平', text: '真想。楼下那段路修好了，我还没走过。周二修理角有人等我换个收音机旋钮。' },
      { id: 'S06-03', speaker: '陈遥', text: '一点也不遗憾？' },
      { id: 'S06-04', speaker: '陈建平', text: '当然舍不得这里。舍不得跟想走，也能一起有。回去种葱，我还得学少浇水。' },
      { id: 'S06-05', speaker: '许棠 · 字幕通话', text: '最后一项是固定点验收。做完它，你可以重新填写现在的选择。小时候画过什么，不限制今天的三个选项。' },
      { id: 'S06-06', speaker: '陈建平', text: '图是你的。带不带上船，都能拿走。' },
    ],
  },
  S07A: {
    title: '第一段，还在开始',
    kicker: 'S07A · 下一放行窗口 / 长程出发准备',
    goal: '核对第一航段与准备状态，把旧画固定在仪表旁，操作舱内灯，再确认出发清单。现在尚未抵达 L2。',
    lines: [
      { id: 'S07A-01', speaker: '航段清单', text: '当前第一段：轨道站港 → 地月 L2 观测泊位。计划 9 日转移；抵达后 21 日观测。适航已核验，出发清单待本人确认。' },
      { id: 'S07A-02', speaker: '许棠 · 字幕通话', text: '你加入的是已有值班团队。返航按窗口安排，今天先做好离站这一段。旧画请固定在侧袋，别挡仪表。' },
      { id: 'S07A-03', speaker: '陈建平 · 地面通话字幕', text: '我按票到家了。那条路还真平。东西都带好了？' },
      { id: 'S07A-04', speaker: '陈遥', text: '图在这里，等我固定好包，再试一下灯。' },
      { id: 'S07A-05', speaker: '陈建平 · 地面通话字幕', text: '嗯。' },
      { id: 'S07A-06', speaker: '陈建平 · 地面通话字幕', text: '玩得高兴。' },
    ],
  },
  S07B: {
    title: '先去一次',
    kicker: 'S07B · 下一放行窗口 / 近程出发准备',
    goal: '核对 36 小时的试航安排，把旧画固定在侧袋，操作舱内灯，再确认本次清单。此航段本身就是完整任务。',
    lines: [
      { id: 'S07B-01', speaker: '航段清单', text: '当前航段：近地轨道试航环线。计划 36 小时，两个观测段后按窗口返站。适航已核验，出发清单待本人确认。' },
      { id: 'S07B-02', speaker: '陈建平 · 地面通话字幕', text: '几点能再联系？我到家先把窗台擦了。' },
      { id: 'S07B-03', speaker: '陈遥', text: '消息按窗口收发。预计返站后再通话，有变动让项目发消息，不保证随时接通。' },
      { id: 'S07B-04', speaker: '陈遥', text: '我先去看看。就这一次完整的试航。' },
      { id: 'S07B-05', speaker: '陈建平 · 地面通话字幕', text: '好。那我可得少浇点水。图收好了？' },
      { id: 'S07B-06', speaker: '陈建平 · 地面通话字幕', text: '玩得高兴。' },
    ],
  },
  S07C: {
    title: '没有作废的那张画',
    kicker: 'S07C · 返程交通舱 / 这次回家',
    goal: '把旧图收进自己的文件夹，决定是否保存公开联系方式，再操作交通舱阅读灯。不需要填写未来日期。',
    lines: [
      { id: 'S07C-01', speaker: '许棠 · 字幕消息', text: '验收记录已接收。本次不加入已登记，未提交后续参与申请。项目按原定团队继续；无需给出下一次日期。' },
      { id: 'S07C-02', speaker: '陈遥', text: '这次先不去了。' },
      { id: 'S07C-03', speaker: '陈建平', text: '好。我们把包放稳，别让它一转弯又溜了。' },
      { id: 'S07C-04', speaker: '陈遥', text: '图还给我吗？' },
      { id: 'S07C-05', speaker: '陈建平', text: '本来就是你的。文件夹里有硬纸板，垫在下面。' },
      { id: 'S07C-06', speaker: '陈建平', text: '回去我先试走那段路。你要有别的安排，就忙你的。' },
    ],
  },
  S08: {
    title: '星期六出发',
    kicker: 'S08 · 舱内 / 再看一次灯',
    goal: '可以继续开关舱内灯，重看旧画、成年计划与验收记录。它们分别保存过去的想象、今天的决定和已经完成的工作。',
    lines: [
      { id: 'S08-01', speaker: '旁白', text: '验收记录已经交清。纸上的旧字没有被擦掉，成年计划也没有照抄它。' },
      { id: 'S08-02', speaker: '旁白', text: '窗外的尺度很大，灯的开关很小。你仍然可以伸手碰到。' },
      { id: 'S08-03', speaker: '旁白', text: '这里可以停留。不必再填写什么，才算完成今天。' },
    ],
  },
};

/** Optional short reactions let actions acknowledge their visible result. */
export const RESPONSES: Record<string, { speaker: string; text: string }> = {
  putBag: { speaker: '陈遥', text: '先放下。今天的验收我看过，只有三项。' },
  finishReply: { speaker: '陈遥', text: '回复好了：验收记录交付后再联系。现在能把终端收起来了。' },
  openToolbox: { speaker: '陈建平', text: '夹袋里是票和资料。你自己看，别只听我说。' },
  verifyReport: { speaker: '自动维护单元', text: '人工核对已记录。两项均在容差内，自动维护继续正常值守。' },
  connectLamp: { speaker: '陈遥', text: 'P2 接点已确认，新检修位和标准图一致。下一步试亮灯。' },
  wrongLamp: { speaker: '终端', text: '这个端口不是新检修位。请按文字标识选择 P2；自动维护仍正常运行。' },
  inferDrawing: { speaker: '陈建平', text: '你认出自己的字了？是你画的。等我把背面摊开，还有你给船长和修船的人留的座位。' },
  unfoldOuter: { speaker: '陈遥', text: '是同一张纸。黑笔是后来的项目说明，铅笔线藏在内折里。' },
  unfoldInner: { speaker: '陈建平', text: '「爸爸修船」「我当船长」。谁都没站在船外头。' },
  unfoldBottom: { speaker: '陈建平', text: '「星期六出发」。你还替我算过上班的日子。' },
  placeFlashlight: { speaker: '小陈遥', text: '灯放船头。我坐在这里也够得着。' },
  toggleChildLamp: { speaker: '陈建平', text: '开关就在船长够得着的地方。灯亮的时候，我们再选方向。' },
  verifyFinal: { speaker: '终端', text: '固定点锁止与载荷标识相符。第三项验收完成；今天的工作已具备交付条件。' },
  selectPlan: { speaker: '许棠', text: '这是填写中的选择。请自己写下当前目的地，再读条件并确认；现在还没有提交。' },
  confirmPlan: { speaker: '许棠', text: '本人确认已记录。只处理你刚刚确认的这一份计划，重复按键不会更改它。' },
  storeDrawing: { speaker: '陈遥', text: '图收好了。旧字留着。' },
  contactSave: { speaker: '终端', text: '已保存项目公开联系方式。没有生成未来报名或回来日期。' },
  contactSkip: { speaker: '终端', text: '不保存联系方式。今天的决定已完成，无后续承诺。' },
  endingOwn: { speaker: '陈遥 / 陈建平', text: '「这次是我自己选的。该做的工作我也会做。」「嗯。玩得高兴。」' },
  endingWork: { speaker: '陈遥 / 陈建平', text: '「这次不是去上班。……还会轮班，但这次是我想去的地方。」「嗯。玩得高兴。」' },
  prepareDeparture: { speaker: '航段清单', text: '本人清单已确认。当前只进入你选择的这一段，后续仍按本次安排进行。' },
};

function withLines(scene: SceneContent, lines: DialogueLine[]): SceneContent {
  return { ...scene, lines };
}

export function getSceneContent(state: GameState): SceneContent {
  const base = SCENES[state.sceneId];
  if (state.sceneId === 'S05' && state.earlyInference) {
    return withLines(base, base.lines.map((line) => line.id === 'S05-02'
      ? { ...line, text: '我认出了，是我画的。船头、窗户……这里还有一只工具箱。' }
      : line));
  }
  if (state.sceneId === 'S05_TRUTH') {
    const destination = state.childhoodDestination === 'rain'
      ? '会下雨的星球'
      : '能看见三个月亮的地方';
    return withLines(base, base.lines.map((line) => {
      if (line.id === 'S05T-01' && state.earlyInference) {
        return { ...line, text: `我刚才猜到了。想起来一点：${destination}，还有这盏灯。` };
      }
      if (line.id === 'S05T-02') {
        return { ...line, text: `你当时选了${destination}。你说周一到周五我要上班，所以只能星期六。我收工具的时候又看见了。` };
      }
      return line;
    }));
  }
  if (state.sceneId === 'S07A' || state.sceneId === 'S07B') {
    const lines = base.lines.map((line) => line.id === 'S07A-04'
      ? {
        ...line,
        text: state.endingPrep.length === 2 && state.drawingStored && state.endingLampOn
          ? '带好了。图放在侧边，灯也能摸到。'
          : '图在这里，等我固定好包，再试一下灯。',
      }
      : line);
    const response: DialogueLine = {
      id: `${state.sceneId}-choice`,
      speaker: state.endingResponse === null ? '旁白' : '陈遥',
      text: state.endingResponse === null
        ? '通话还没有结束。你可以亲口说出，这次出发对你意味着什么。'
        : state.endingResponse === 'work'
          ? '这次不是去上班。……还会轮班，但这次是我想去的地方。'
          : '这次是我自己选的。该做的工作我也会做。',
    };
    return withLines(base, [...lines.slice(0, 4), response, ...lines.slice(4)]);
  }
  if (state.sceneId === 'S08') {
    const adultDestination = state.adultDestination;
    const branch: DialogueLine = state.adultPlan === 'long_voyage'
      ? { id: 'S08-branch-long', speaker: '航段记录', text: `已确认的当前目的地：${adultDestination}。第一段离站准备完成，转移刚开始；尚未抵达观测泊位，也未完成返航。` }
      : state.adultPlan === 'short_trial'
        ? { id: 'S08-branch-short', speaker: '航段记录', text: `已确认的当前目的地：${adultDestination}。近程试航第一段开始，后续观测与返站按本次清单进行；没有长程参与义务。` }
        : { id: 'S08-branch-home', speaker: '返程记录', text: `本次选择：暂不加入。当前目的地：${adultDestination}。项目由其他成员继续，父亲按自己的退休计划回家。没有未来报名日期。` };
    const contact: DialogueLine[] = state.adultPlan === 'not_now'
      ? [{ id: 'S08-contact', speaker: '终端', text: state.contactDecision === 'save'
        ? '公开联系方式已保存，仅是一条联系人记录。没有约定下一次出发。'
        : '未保存项目联系方式。无需安排下一次，今天仍是完整的一天。' }]
      : [];
    return withLines(base, [branch, base.lines[0], ...contact, ...base.lines.slice(1)]);
  }
  return base;
}
