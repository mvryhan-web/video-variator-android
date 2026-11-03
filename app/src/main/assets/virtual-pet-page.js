document.addEventListener('DOMContentLoaded', () => {
      const pet = window.DeepsyqVirtualPet;
      const promptInput = document.getElementById('simPromptInput');
      const ratioSelect = document.getElementById('simRatioSelect');

      // Attach pet sniffer to the sandbox inputs
      pet.attachToPrompt(promptInput, ratioSelect);

      // Simulation 1: Test Draft Saver
      document.getElementById('btnTestDraft').addEventListener('click', () => {
        pet.saveDraft('Кинематографичный пейзаж неонового Токио 2099 года в лучах заката с дрона', {
          aspectRatio: '16:9'
        });
        promptInput.value = '';
        pet.sniffDraftRescue(promptInput);
      });

      // Simulation 2: Test Ratio Sniffer
      document.getElementById('btnTestRatio').addEventListener('click', () => {
        promptInput.value = 'Динамичный ролик для TikTok и Reels с переходом камеры';
        ratioSelect.value = '16:9';
        pet.sniffFormatRatio(promptInput.value, ratioSelect.value, (newRatio) => {
          ratioSelect.value = newRatio;
        });
      });

      // Simulation 3: Test Job Delivery
      document.getElementById('btnTestJob').addEventListener('click', () => {
        pet.sniffJobReady({
          id: 'job-sim-' + Math.floor(Math.random() * 10000),
          status: 'ready',
          prompt: 'Неоновый киберпанк спорткар в движении'
        });
      });

      // Isolated, explicitly user-triggered fixtures. Not a paid quote or real job.
      const result = document.getElementById('livingDemoResult');
      document.getElementById('btnTestQuantity').addEventListener('click', () => {
        const decision = pet.offerLivingHint('S01',{
          source:'mock-preview',verified:true,userRequested:true,
          signature:'quantity-2-preview',quantity:2,quoteVerified:true
        },'Демо: выбраны 2 изображения. Настоящая стоимость неизвестна. Хотите изменить количество и запросить новую смету?',[
          {label:'Проверить количество',onClick:()=>{result.textContent='Демо: пользователь выбрал проверку. Платная задача не отправлена.';}},
          {label:'Оставить 2',onClick:()=>{result.textContent='Демо: количество сохранено. Платная задача не отправлена.';}}
        ],'alert');
        result.textContent=decision.show?'S01: проверенное демо-событие, без расходов.':'S01: '+decision.reason;
      });
      document.getElementById('btnTestDuplicate').addEventListener('click', () => {
        const decision=pet.offerLivingHint('S02',{
          source:'mock-preview',verified:true,userRequested:true,
          signature:'queued-job-preview',jobId:'mock-queued-1',queued:true
        },'Демо: задача уже отправлена в тестовую очередь. Второй запрос не создан.',[
          {label:'Посмотреть статус',onClick:()=>{result.textContent='Демо: mock-queued-1 — в очереди, 0 платных вызовов.';}}
        ],'alert');
        result.textContent=decision.show?'S02: одно демо-задание, повторное создание не выполнено.':'S02: '+decision.reason;
      });

      // Sandbox controls
      document.getElementById('btnSimSave').addEventListener('click', () => {
        if (!promptInput.value.trim()) {
          promptInput.value = 'Креативная концепция нового продукта для рекламной кампании';
        }
        pet.saveDraft(promptInput.value, { aspectRatio: ratioSelect.value });
        pet.speak('Черновик успешно сохранён! Если ты закроешь страницу, я напомню о нём.', [], 'friendly');
      });

      document.getElementById('btnSimClear').addEventListener('click', () => {
        promptInput.value = '';
      });

      document.getElementById('btnOpenSettings').addEventListener('click', () => {
        pet.openSettingsModal();
      });

      document.getElementById('btnSwitchDog').addEventListener('click', () => {
        pet.saveSettings({ pet: 'dog', name: 'Луна' });
        pet.speak('Привет! Я Луна, твой верный помощник.', [], 'friendly');
      });

      document.getElementById('btnSwitchCat').addEventListener('click', () => {
        pet.saveSettings({ pet: 'cat', name: 'Мира' });
        pet.speak('Мяу! Я Мира, буду аккуратно приглядывать за твоими генерациями.', [], 'friendly');
      });
      document.getElementById('btnSwitchFox').addEventListener('click', () => {
        pet.saveSettings({ pet: 'fox', name: 'Нова' });
        pet.speak('Я Нова — лисёнок. Помогу сохранить идею!', [], 'friendly');
      });

      // --- 3D PETS PRODUCTION STUDIO CONTROLLER ---
      let currentPetKey = 'luna';
      let currentAngle = 'three_quarter';
      let currentBg = 'transparent'; // 'transparent' | 'dark' | 'light'
      let currentSize = 168;
      let animInterval = null;
      const assetVersion = 'f8-sprite-preload-20261103-1';

      const petData = {
        luna: {
          accessibilityName: 'Luna the corgi',
          title: '🐕 Луна (Собака-корги)',
          desc: 'Маленький корги: медно-рыжая шерсть #D89150, кремово-белые участки #F6E8CE, медовые глаза #8B5737 и аккуратный мятный акцент #40DFAE. Защитник и верный спутник.',
          badge: '#40DFAE'
        },
        mira: {
          accessibilityName: 'Mira the cat',
          title: '🐱 Мира (Дымчатая кошка)',
          desc: 'Тёмная дымчато-графитовая шерсть #28394E, кремовые акценты #F1ECE6, мятные глаза #66C4AD. Гибкое кошачье тело, длинный хвост. Спокойная и наблюдательная.',
          badge: '#66C4AD'
        },
        nova: {
          accessibilityName: 'Nova the fox',
          title: '🦊 Нова (Рыжий лисёнок)',
          desc: 'Тёплая рыжая шерсть #EA853A, светлые участки #FFF4DF, пушистый длинный хвост, острые ушки, узкая лисья морда и мятно-изумрудные детали #4ADDB7. Любопытный исследователь.',
          badge: '#4ADDB7'
        }
      };

      const previewImg = document.getElementById('petPreviewImg');
      const viewportBox = document.getElementById('petViewportBox');
      const cardTitle = document.getElementById('petCardTitle');
      const cardDesc = document.getElementById('petCardDesc');
      const cardBadge = document.getElementById('petCardBadge');
      const linkGlb = document.getElementById('linkGlb');
      const linkBlend = document.getElementById('linkBlend');
      const scaleBadge = document.getElementById('petScaleBadge');

      function stopAnimation() {
        if (animInterval) {
          clearInterval(animInterval);
          animInterval = null;
        }
      }

      function updatePreviewImage() {
        stopAnimation();
        let bgSuffix = '';
        if (currentBg === 'dark') bgSuffix = '_dark';
        else if (currentBg === 'light') bgSuffix = '_light';
        previewImg.src = `virtual-pet/${currentPetKey}/renders/${currentAngle}${bgSuffix}.png?v=${assetVersion}`;
      }

      function selectPet(key) {
        currentPetKey = key;
        const d = petData[key];
        previewImg.alt = `Animated ${d.accessibilityName} preview`;
        cardTitle.textContent = d.title;
        cardDesc.textContent = d.desc;
        cardBadge.style.color = d.badge;
        cardBadge.style.borderColor = d.badge + '55';
        cardBadge.style.backgroundColor = d.badge + '22';
        linkGlb.href = `virtual-pet/${key}/glb/${key}.glb`;
        linkBlend.href = `virtual-pet/${key}/source/${key}.blend`;

        document.getElementById('btnInspectLuna').className = key === 'luna' ? 'ds-pet-btn ds-pet-btn-primary' : 'ds-pet-btn ds-pet-btn-secondary';
        document.getElementById('btnInspectMira').className = key === 'mira' ? 'ds-pet-btn ds-pet-btn-primary' : 'ds-pet-btn ds-pet-btn-secondary';
        document.getElementById('btnInspectNova').className = key === 'nova' ? 'ds-pet-btn ds-pet-btn-primary' : 'ds-pet-btn ds-pet-btn-secondary';
        updatePreviewImage();
        playSpriteLoop('idle_breathe');
      }

      document.getElementById('btnInspectLuna').addEventListener('click', () => selectPet('luna'));
      document.getElementById('btnInspectMira').addEventListener('click', () => selectPet('mira'));
      document.getElementById('btnInspectNova').addEventListener('click', () => selectPet('nova'));

      document.querySelectorAll('.btn-angle').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.btn-angle').forEach(b => b.style.fontWeight = 'normal');
          btn.style.fontWeight = 'bold';
          currentAngle = btn.getAttribute('data-angle');
          updatePreviewImage();
        });
      });

      document.getElementById('btnBgDark').addEventListener('click', () => {
        currentBg = 'dark';
        viewportBox.style.background = '#0b0f19';
        updatePreviewImage();
      });
      document.getElementById('btnBgLight').addEventListener('click', () => {
        currentBg = 'light';
        viewportBox.style.background = '#f8f9fa';
        updatePreviewImage();
      });

      document.getElementById('btnSize80').addEventListener('click', () => {
        currentSize = 80;
        previewImg.style.width = '80px';
        previewImg.style.height = '80px';
        scaleBadge.textContent = '80 px';
      });
      document.getElementById('btnSize132').addEventListener('click', () => {
        currentSize = 132;
        previewImg.style.width = '132px';
        previewImg.style.height = '132px';
        scaleBadge.textContent = '132 px';
      });
      document.getElementById('btnSize168').addEventListener('click', () => {
        currentSize = 168;
        previewImg.style.width = '168px';
        previewImg.style.height = '168px';
        scaleBadge.textContent = '168 px';
      });

      function playSpriteLoop(animName) {
        stopAnimation();
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
          updatePreviewImage();
          return;
        }
        let frame = 0;
        animInterval = setInterval(() => {
          previewImg.src = `virtual-pet/${currentPetKey}/sprites/${animName}_0${frame}.png?v=${assetVersion}`;
          frame = (frame + 1) % 8;
        }, 125);
      }

      document.getElementById('btnPlayBreathe').addEventListener('click', () => playSpriteLoop('idle_breathe'));
      document.getElementById('btnPlayWalk').addEventListener('click', () => playSpriteLoop('walk_loop'));
      document.getElementById('btnStopAnim').addEventListener('click', updatePreviewImage);
      selectPet(currentPetKey);
    });
  
