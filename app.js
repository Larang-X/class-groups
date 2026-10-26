/**
 * 우리 반 모둠 나누기 애플리케이션
 */

// ===== 애플리케이션 상태 (State) =====
const state = {
  totalStudents: 25,
  groupSize: 4,
  remainderPolicy: 'distribute', // 'distribute' (골고루 분배) | 'extra_group' (별도 모둠 생성)
  assignLeader: true,
  assignRoles: false,
  revealAnimation: true,
  soundEnabled: true,
  absentStudents: new Set(),
  currentGroups: []
};

// 역할 프리셋 (역할 분담 활성화 시)
const ROLE_PRESETS = ['👑 이끄미(모둠장)', '📝 기록이', '⏱️ 지킴이', '📢 발표이', '🎨 나눔이', '🧹 도우미'];

// ===== 사운드 효과 (Web Audio API - 외부 파일 필요 없음) =====
class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playTick() {
    if (!state.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400 + Math.random() * 200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  playFanfare() {
    if (!state.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + i * 0.1;
        const duration = i === notes.length - 1 ? 0.45 : 0.15;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  playPop() {
    if (!state.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }
}

const sounds = new SoundEffects();

// ===== 축하 컨페티 (Confetti) 파티클 시스템 =====
class Confetti {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    this.particles = [];
    const colors = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: window.innerWidth * (0.2 + Math.random() * 0.6),
        y: window.innerHeight * 0.4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 12 - 4,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animate();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    let activeCount = 0;

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.rotation += p.vRot;
      p.alpha -= 0.008;

      if (p.alpha > 0) {
        activeCount++;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
        this.ctx.restore();
      }
    }

    if (activeCount > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

let confetti = null;

// ===== DOM 요소 참조 =====
const elTotalStudentsInput = document.getElementById('totalStudentsInput');
const elGroupSizeInput = document.getElementById('groupSizeInput');
const elBtnDecStudent = document.getElementById('btnDecStudent');
const elBtnIncStudent = document.getElementById('btnIncStudent');
const elBtnDecGroupSize = document.getElementById('btnDecGroupSize');
const elBtnIncGroupSize = document.getElementById('btnIncGroupSize');
const elStudentNumberGrid = document.getElementById('studentNumberGrid');
const elActiveCount = document.getElementById('activeCount');
const elAbsentSummary = document.getElementById('absentSummary');
const elBtnResetAbsent = document.getElementById('btnResetAbsent');
const elChkAssignLeader = document.getElementById('chkAssignLeader');
const elChkAssignRoles = document.getElementById('chkAssignRoles');
const elChkRevealAnimation = document.getElementById('chkRevealAnimation');
const elBtnCreateGroups = document.getElementById('btnCreateGroups');
const elBtnReshuffle = document.getElementById('btnReshuffle');
const elBtnRerollLeaders = document.getElementById('btnRerollLeaders');
const elBtnCopyText = document.getElementById('btnCopyText');
const elBtnPrint = document.getElementById('btnPrint');
const elGroupsGrid = document.getElementById('groupsGrid');
const elResultMeta = document.getElementById('resultMeta');
const elDrawOverlay = document.getElementById('drawOverlay');
const elBtnSoundToggle = document.getElementById('btnSoundToggle');
const elSoundIcon = document.getElementById('soundIcon');
const elBtnFullscreen = document.getElementById('btnFullscreen');
const elBtnToggleSettings = document.getElementById('btnToggleSettings');
const elSettingsBody = document.getElementById('settingsBody');

// ===== 로컬 스토리지 저장 및 불러오기 =====
const STORAGE_KEY = 'class_group_maker_settings';

function loadSavedSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.totalStudents) state.totalStudents = Number(data.totalStudents);
      if (data.groupSize) state.groupSize = Number(data.groupSize);
      if (data.remainderPolicy) state.remainderPolicy = data.remainderPolicy;
      if (data.assignLeader !== undefined) state.assignLeader = Boolean(data.assignLeader);
      if (data.assignRoles !== undefined) state.assignRoles = Boolean(data.assignRoles);
      if (data.revealAnimation !== undefined) state.revealAnimation = Boolean(data.revealAnimation);
      if (data.soundEnabled !== undefined) state.soundEnabled = Boolean(data.soundEnabled);
      if (Array.isArray(data.absentStudents)) {
        state.absentStudents = new Set(data.absentStudents);
      }
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
}

function saveSettings() {
  try {
    const data = {
      totalStudents: state.totalStudents,
      groupSize: state.groupSize,
      remainderPolicy: state.remainderPolicy,
      assignLeader: state.assignLeader,
      assignRoles: state.assignRoles,
      revealAnimation: state.revealAnimation,
      soundEnabled: state.soundEnabled,
      absentStudents: Array.from(state.absentStudents)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

// ===== 결석자 번호 그리드 렌더링 =====
function renderStudentChips() {
  elStudentNumberGrid.innerHTML = '';
  
  // 현재 설정된 총 학생 수까지 칩 생성
  for (let num = 1; num <= state.totalStudents; num++) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'num-chip' + (state.absentStudents.has(num) ? ' absent' : '');
    chip.textContent = num;
    chip.title = state.absentStudents.has(num) ? `${num}번 (결석) - 클릭 시 출석으로 변경` : `${num}번 (출석) - 클릭 시 결석으로 제외`;

    chip.addEventListener('click', () => {
      if (state.absentStudents.has(num)) {
        state.absentStudents.delete(num);
      } else {
        // 최소 1명 이상은 출석 상태여야 함
        if (state.totalStudents - state.absentStudents.size <= 1) {
          alert('최소 1명 이상의 학생은 출석해야 합니다.');
          return;
        }
        state.absentStudents.add(num);
      }
      sounds.playPop();
      updateAbsentStats();
      renderStudentChips();
      saveSettings();
    });

    elStudentNumberGrid.appendChild(chip);
  }

  updateAbsentStats();
}

function updateAbsentStats() {
  const activeCount = state.totalStudents - state.absentStudents.size;
  elActiveCount.textContent = activeCount;
  
  if (state.absentStudents.size > 0) {
    const absentList = Array.from(state.absentStudents).sort((a, b) => a - b).join(', ');
    elAbsentSummary.textContent = `(결석 ${state.absentStudents.size}명: ${absentList}번)`;
  } else {
    elAbsentSummary.textContent = '(결석 0명)';
  }
}

// ===== 모둠 분배 알고리즘 =====
function calculateGroups() {
  // 1. 출석한 학생 번호 목록 추출
  const activeStudents = [];
  for (let i = 1; i <= state.totalStudents; i++) {
    if (!state.absentStudents.has(i)) {
      activeStudents.push(i);
    }
  }

  const M = activeStudents.length;
  const k = state.groupSize;

  if (M < 2) {
    alert('모둠을 나누려면 최소 2명 이상의 출석 학생이 필요합니다.');
    return null;
  }

  // 2. Fisher-Yates 셔플로 완벽한 무작위 섞기
  for (let i = activeStudents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeStudents[i], activeStudents[j]] = [activeStudents[j], activeStudents[i]];
  }

  // 3. 모둠별 인원수 계산
  let groupCapacities = [];
  
  if (state.remainderPolicy === 'distribute') {
    // 골고루 분배: 전체 학생 / 모둠 크기
    const baseGroups = Math.floor(M / k);
    if (baseGroups === 0) {
      // 총 인원이 목표 인원수보다 적은 경우 1개 모둠으로 편성
      groupCapacities = [M];
    } else {
      const remainder = M % k;
      groupCapacities = Array(baseGroups).fill(k);
      // 남는 학생을 앞에서부터 1명씩 더해줌
      for (let i = 0; i < remainder; i++) {
        groupCapacities[i] += 1;
      }
    }
  } else {
    // 별도 모둠 생성 (extra_group)
    const baseGroups = Math.floor(M / k);
    const remainder = M % k;
    groupCapacities = Array(baseGroups).fill(k);
    if (remainder > 0) {
      groupCapacities.push(remainder);
    }
  }

  // 4. 모둠 생성 및 학생 배정
  const groups = [];
  let currentIndex = 0;

  groupCapacities.forEach((size, groupIdx) => {
    const groupMembers = [];
    for (let s = 0; s < size; s++) {
      groupMembers.push({
        number: activeStudents[currentIndex++],
        isLeader: false,
        role: ''
      });
    }

    // 모둠장 지정: 모둠원 중 무작위 1명
    if (state.assignLeader && groupMembers.length > 0) {
      const leaderIdx = Math.floor(Math.random() * groupMembers.length);
      groupMembers[leaderIdx].isLeader = true;
      if (state.assignRoles) {
        groupMembers[leaderIdx].role = ROLE_PRESETS[0];
      }
    }

    // 세부 역할 자동 분담
    if (state.assignRoles) {
      let roleIdx = 1;
      groupMembers.forEach(member => {
        if (!member.isLeader && roleIdx < ROLE_PRESETS.length) {
          member.role = ROLE_PRESETS[roleIdx++];
        }
      });
    }

    groups.push({
      id: groupIdx + 1,
      name: `${groupIdx + 1}모둠`,
      members: groupMembers
    });
  });

  return groups;
}

// ===== 결과 렌더링 =====
function renderGroups(groups) {
  state.currentGroups = groups;
  elGroupsGrid.innerHTML = '';

  if (!groups || groups.length === 0) {
    elGroupsGrid.innerHTML = '<div class="empty-state">모둠이 아직 생성되지 않았습니다.</div>';
    elResultMeta.textContent = '총 0개 모둠';
    return;
  }

  const totalMembers = groups.reduce((acc, g) => acc + g.members.length, 0);
  elResultMeta.textContent = `총 ${groups.length}개 모둠 (학생 ${totalMembers}명)`;

  groups.forEach((group, gIdx) => {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.groupId = group.id;

    // 모둠 카드 헤더
    const header = document.createElement('div');
    header.className = 'group-card-header';
    header.innerHTML = `
      <div class="group-card-title">
        <span class="group-badge">${group.id}</span>
        <span class="group-name">${group.name}</span>
      </div>
      <span class="group-member-count">${group.members.length}명</span>
    `;

    // 모둠원 바디 (드래그 앤 드롭 타겟)
    const body = document.createElement('div');
    body.className = 'group-card-body';
    body.dataset.groupId = group.id;

    group.members.forEach((member, mIdx) => {
      const chip = createMemberChip(member, group.id, mIdx);
      body.appendChild(chip);
    });

    // 드래그 앤 드롭 이벤트 등록 (모둠 간 학생 이동)
    setupDropZone(body, group.id);

    // 모둠 카드 푸터
    const footer = document.createElement('div');
    footer.className = 'group-card-footer';
    const btnGroupLeaderReroll = document.createElement('button');
    btnGroupLeaderReroll.type = 'button';
    btnGroupLeaderReroll.className = 'card-mini-btn';
    btnGroupLeaderReroll.innerHTML = '👑 모둠장 뽑기';
    btnGroupLeaderReroll.title = '이 모둠의 모둠장을 무작위로 다시 뽑습니다';
    btnGroupLeaderReroll.addEventListener('click', () => {
      rerollSingleGroupLeader(group.id);
    });
    footer.appendChild(btnGroupLeaderReroll);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    elGroupsGrid.appendChild(card);
  });
}

// 개별 학생 칩 생성 (드래그 가능)
function createMemberChip(member, groupId, memberIdx) {
  const chip = document.createElement('div');
  chip.className = 'member-chip' + (member.isLeader ? ' is-leader' : '');
  chip.draggable = true;
  chip.dataset.groupId = groupId;
  chip.dataset.memberNumber = member.number;

  const left = document.createElement('div');
  left.className = 'member-chip-left';

  const numSpan = document.createElement('span');
  numSpan.className = 'member-number';
  numSpan.textContent = member.number;

  left.appendChild(numSpan);

  if (member.isLeader) {
    const leaderBadge = document.createElement('span');
    leaderBadge.className = 'leader-badge';
    leaderBadge.innerHTML = '👑 모둠장';
    left.appendChild(leaderBadge);
  }

  chip.appendChild(left);

  if (member.role && !member.isLeader) {
    const roleTag = document.createElement('span');
    roleTag.className = 'role-tag';
    roleTag.textContent = member.role;
    chip.appendChild(roleTag);
  }

  // 드래그 시작/종료
  chip.addEventListener('dragstart', (e) => {
    chip.classList.add('dragging');
    e.dataTransfer.setData('text/plain', JSON.stringify({
      fromGroupId: groupId,
      memberNumber: member.number
    }));
  });

  chip.addEventListener('dragend', () => {
    chip.classList.remove('dragging');
  });

  return chip;
}

// 드롭존 설정
function setupDropZone(bodyElement, targetGroupId) {
  bodyElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    bodyElement.closest('.group-card').classList.add('drag-over');
  });

  bodyElement.addEventListener('dragleave', (e) => {
    // 카드를 벗어났을 때만 해제
    if (!bodyElement.contains(e.relatedTarget)) {
      bodyElement.closest('.group-card').classList.remove('drag-over');
    }
  });

  bodyElement.addEventListener('drop', (e) => {
    e.preventDefault();
    bodyElement.closest('.group-card').classList.remove('drag-over');

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const fromGroupId = Number(data.fromGroupId);
      const memberNumber = Number(data.memberNumber);
      const toGroupId = Number(targetGroupId);

      if (fromGroupId === toGroupId) return;

      // 학생 이동 처리
      const fromGroup = state.currentGroups.find(g => g.id === fromGroupId);
      const toGroup = state.currentGroups.find(g => g.id === toGroupId);

      if (!fromGroup || !toGroup) return;

      const memberIdx = fromGroup.members.findIndex(m => m.number === memberNumber);
      if (memberIdx === -1) return;

      const [movedMember] = fromGroup.members.splice(memberIdx, 1);
      toGroup.members.push(movedMember);

      sounds.playPop();
      renderGroups(state.currentGroups);
    } catch (err) {
      console.warn('Drop error:', err);
    }
  });
}

// 단일 모둠 모둠장 재추첨
function rerollSingleGroupLeader(groupId) {
  const group = state.currentGroups.find(g => g.id === groupId);
  if (!group || group.members.length === 0) return;

  group.members.forEach(m => { m.isLeader = false; });
  const luckyIdx = Math.floor(Math.random() * group.members.length);
  group.members[luckyIdx].isLeader = true;

  sounds.playFanfare();
  renderGroups(state.currentGroups);
}

// 전체 모둠장 일괄 재추첨
function rerollAllLeaders() {
  if (!state.currentGroups || state.currentGroups.length === 0) {
    alert('먼저 모둠을 생성해주세요.');
    return;
  }

  state.currentGroups.forEach(group => {
    if (group.members.length > 0) {
      group.members.forEach(m => { m.isLeader = false; });
      const luckyIdx = Math.floor(Math.random() * group.members.length);
      group.members[luckyIdx].isLeader = true;
    }
  });

  sounds.playFanfare();
  renderGroups(state.currentGroups);
}

// ===== 모둠 나누기 실행 함수 =====
function executeGrouping() {
  const groups = calculateGroups();
  if (!groups) return;

  if (state.revealAnimation) {
    // 두구두구 연출 표시
    elDrawOverlay.classList.remove('hidden');
    let tickCount = 0;
    const interval = setInterval(() => {
      sounds.playTick();
      tickCount++;
      if (tickCount >= 8) {
        clearInterval(interval);
        elDrawOverlay.classList.add('hidden');
        renderGroups(groups);
        sounds.playFanfare();
        confetti.start();
        // 결과 영역으로 스크롤 이동
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
      }
    }, 120);
  } else {
    renderGroups(groups);
    sounds.playFanfare();
    confetti.start();
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
  }
}

// ===== 텍스트 복사 기능 =====
function copyResultsToClipboard() {
  if (!state.currentGroups || state.currentGroups.length === 0) {
    alert('복사할 모둠 결과가 없습니다.');
    return;
  }

  let text = `[우리 반 모둠 편성 결과]\n`;
  text += `총 ${state.currentGroups.length}개 모둠 | 학생 ${state.totalStudents - state.absentStudents.size}명\n`;
  if (state.absentStudents.size > 0) {
    text += `결석: ${Array.from(state.absentStudents).sort((a,b)=>a-b).join(', ')}번\n`;
  }
  text += `---------------------------------\n`;

  state.currentGroups.forEach(g => {
    const memberTexts = g.members.map(m => {
      let t = `${m.number}번`;
      if (m.isLeader) t += '(👑모둠장)';
      else if (m.role) t += `(${m.role})`;
      return t;
    });
    text += `■ ${g.name} (${g.members.length}명): ${memberTexts.join(', ')}\n`;
  });

  navigator.clipboard.writeText(text).then(() => {
    alert('모둠 결과가 클립보드에 복사되었습니다! (학급 게시판이나 알림장에 붙여넣으세요)');
  }).catch(() => {
    alert('클립보드 복사에 실패했습니다.');
  });
}

// ===== 전체화면 토글 =====
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn('Fullscreen error:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

// ===== 이벤트 리스너 등록 =====
function setupEventListeners() {
  // 학생 수 증감
  elBtnDecStudent.addEventListener('click', () => {
    if (state.totalStudents > 2) {
      state.totalStudents--;
      elTotalStudentsInput.value = state.totalStudents;
      state.absentStudents.delete(state.totalStudents + 1);
      renderStudentChips();
      saveSettings();
    }
  });

  elBtnIncStudent.addEventListener('click', () => {
    if (state.totalStudents < 60) {
      state.totalStudents++;
      elTotalStudentsInput.value = state.totalStudents;
      renderStudentChips();
      saveSettings();
    }
  });

  elTotalStudentsInput.addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 2) val = 2;
    if (val > 60) val = 60;
    state.totalStudents = val;
    e.target.value = val;
    // 제거된 번호의 결석자 정리
    Array.from(state.absentStudents).forEach(num => {
      if (num > val) state.absentStudents.delete(num);
    });
    renderStudentChips();
    saveSettings();
  });

  // 모둠 크기 증감
  elBtnDecGroupSize.addEventListener('click', () => {
    if (state.groupSize > 2) {
      state.groupSize--;
      elGroupSizeInput.value = state.groupSize;
      saveSettings();
    }
  });

  elBtnIncGroupSize.addEventListener('click', () => {
    if (state.groupSize < 15) {
      state.groupSize++;
      elGroupSizeInput.value = state.groupSize;
      saveSettings();
    }
  });

  elGroupSizeInput.addEventListener('change', (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 2) val = 2;
    if (val > 15) val = 15;
    state.groupSize = val;
    e.target.value = val;
    saveSettings();
  });

  // 라디오 옵션: 나머지 분배 정책
  document.querySelectorAll('input[name="remainderPolicy"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.remainderPolicy = e.target.value;
      saveSettings();
    });
  });

  // 모둠장 및 옵션 체크박스
  elChkAssignLeader.addEventListener('change', (e) => {
    state.assignLeader = e.target.checked;
    saveSettings();
  });

  elChkAssignRoles.addEventListener('change', (e) => {
    state.assignRoles = e.target.checked;
    saveSettings();
  });

  elChkRevealAnimation.addEventListener('change', (e) => {
    state.revealAnimation = e.target.checked;
    saveSettings();
  });

  // 전원 출석 리셋 버튼
  elBtnResetAbsent.addEventListener('click', () => {
    state.absentStudents.clear();
    sounds.playPop();
    renderStudentChips();
    saveSettings();
  });

  // 상단 툴바 액션
  elBtnSoundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    elSoundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
    saveSettings();
  });

  elBtnFullscreen.addEventListener('click', toggleFullscreen);

  // 설정 패널 접기/펼치기
  elBtnToggleSettings.addEventListener('click', () => {
    const isHidden = elSettingsBody.style.display === 'none';
    elSettingsBody.style.display = isHidden ? 'grid' : 'none';
    elBtnToggleSettings.textContent = isHidden ? '접기 ▲' : '설정 열기 ▼';
  });

  // 실행 및 결과 액션
  elBtnCreateGroups.addEventListener('click', executeGrouping);
  elBtnReshuffle.addEventListener('click', executeGrouping);
  elBtnRerollLeaders.addEventListener('click', rerollAllLeaders);
  elBtnCopyText.addEventListener('click', copyResultsToClipboard);
  elBtnPrint.addEventListener('click', () => window.print());
}

// ===== 앱 초기화 =====
function initApp() {
  loadSavedSettings();

  // UI 상태 복원
  elTotalStudentsInput.value = state.totalStudents;
  elGroupSizeInput.value = state.groupSize;
  const targetRadio = document.querySelector(`input[name="remainderPolicy"][value="${state.remainderPolicy}"]`);
  if (targetRadio) targetRadio.checked = true;
  elChkAssignLeader.checked = state.assignLeader;
  elChkAssignRoles.checked = state.assignRoles;
  elChkRevealAnimation.checked = state.revealAnimation;
  elSoundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';

  confetti = new Confetti('confettiCanvas');

  renderStudentChips();
  setupEventListeners();
}

// DOM 로드 시 시작
document.addEventListener('DOMContentLoaded', initApp);
