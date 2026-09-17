import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

gsap.registerPlugin(ScrollTrigger);

/* =====================================================
   FIX #1 — باج التداخل على الموبايل (overlap bug)
   شريط العنوان في متصفح الموبايل بيظهر ويختفي وهو انت
   بتسكرول، وده بيغيّر window.innerHeight كل شوية.
   GSAP ScrollTrigger كان بياخد الحركة دي كـ "resize"
   حقيقي وبيعيد حساب أماكن كل الـpinned sections تاني
   وهي لسه شغالة — وده اللي بيسبب إن كل حاجة تدخل في بعض.
   السطر ده بيقول لـScrollTrigger يتجاهل الرجفة دي.
===================================================== */
ScrollTrigger.config({ ignoreMobileResize: true });

/* =====================================================
   FIX #2 — كشف الأجهزة الضعيفة
   بنستخدمه عشان نقفل الظلال والـantialiasing وموديلات
   التفاصيل الزيادة على الموبايل والأجهزة القديمة، وده
   اللي كان بيخلي الموقع "يهنج" أو يقفل نفسه على الفون.
===================================================== */
const isMobile =
    matchMedia("(max-width: 900px)").matches ||
    ("ontouchstart" in window && matchMedia("(pointer: coarse)").matches);

const isLowPower =
    isMobile &&
    (typeof navigator.deviceMemory === "number"
        ? navigator.deviceMemory <= 4
        : true);

function debounce(fn, wait) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}


/* =====================================================
   DOM
===================================================== */

const carExperience = document.getElementById("carExperience");
const car3DContainer = document.getElementById("car3DContainer");

const carSelect = document.getElementById("carSelect");
const currencyToggle = document.getElementById("currencyToggle");
const langToggle = document.getElementById("langToggle");

const garageLogo = document.querySelector(".logo");

const cinematicBrand = document.getElementById("cinematicBrand");
const cinematicTitle = document.getElementById("cinematicTitle");
const cinematicYear = document.getElementById("cinematicYear");

const carTitle = document.getElementById("carTitle");
const specEngine = document.getElementById("specEngine");
const specHp = document.getElementById("specHp");
const specAcc = document.getElementById("specAcc");

const carPrice = document.getElementById("carPrice");
const storyPrice = document.getElementById("storyPrice");

const finalCarTitle = document.getElementById("finalCarTitle");
const finalPrice = document.getElementById("finalPrice");

const bbsWheelImg = document.getElementById("bbsWheelImg");

const cinematicCard = document.getElementById("cinematicCard");

const storyEngine = document.querySelector(".story-engine");
const storyPerformance = document.querySelector(".story-performance");
const storySpeed = document.querySelector(".story-speed");
const storyPriceItem = document.querySelector(".story-price");

const finalDetails = document.querySelector(".final-details");


/* =====================================================
   STATE
===================================================== */

let currentCarKey = "m5";
let isUSD = false;

let scene = null;
let camera = null;
let renderer = null;

let currentModel = null;
let currentFloor = null;
let rafId = null;

/* =====================================================
   FIX #3 — تحميل موديلات مضغوطة (Draco)
   موديلات GLB بتاعت BMW / Porsche غالباً كبيرة جداً
   (ممكن تكون ٥٠-٢٠٠ ميجا للموديل الواحد من غير ضغط).
   على الفون ده بيخلص الرامات المتاحة للمتصفح ويكسر
   الـWebGL context تماماً — ده سبب رئيسي إن "كل حاجة
   بايظة" على الموبايل تحديداً.

   الحل الكامل: تضغط الموديلات نفسها مرة واحدة بأمر
   زي:  npx gltf-transform optimize model.glb model.glb
   أو:  gltfpack -i model.glb -o model.glb -cc
   وبعدين الـDRACOLoader هنا هيقدر يفك الضغط في المتصفح.
   لو الملفات لسه مش مضغوطة، السطور دي مش هتأذي حاجة —
   بس الفايدة الحقيقية مش هتظهر غير بعد ضغط الملفات.
===================================================== */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
);

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

let cinematicTimeline = null;


/* =====================================================
   REAL HEADLIGHT STATE
===================================================== */

let headlightMeshes = [];
let headlightTimer = null;
let headlightAnimation = null;


/* =====================================================
   CAR ROTATION
===================================================== */

let isDraggingCar = false;
let previousMouseX = 0;

let targetCarRotationY = -0.35;

const mouseRotationSpeed = 0.008;


/* =====================================================
   CAR DATA
===================================================== */

function getCurrentCar() {

    return (
        window.carData?.[currentCarKey] ||
        null
    );
}


/* =====================================================
   PRICE
===================================================== */

function formatEGP(value) {

    if (value == null) {
        return "--";
    }

    return (
        new Intl.NumberFormat("en-US").format(value) +
        " ج.م"
    );
}


function formatUSD(value) {

    if (value == null) {
        return "--";
    }

    return (
        "$" +
        new Intl.NumberFormat("en-US").format(value)
    );
}


function formatPrice(car) {

    if (!car?.price) {
        return "--";
    }

    return isUSD
        ? formatUSD(car.price.usd)
        : formatEGP(car.price.egp);
}


function getShortPrice(car) {

    if (!car?.price) {
        return "--";
    }

    if (isUSD) {

        return (
            "$" +
            Math.round(car.price.usd / 1000) +
            "K"
        );
    }

    return (
        car.price.egp / 1000000
    ).toFixed(1) + "M";
}

/* =====================================================
   /* =====================================================
   TRANSLATIONS DICTIONARY (قاموس الترجمات)
===================================================== */

const translations = {
    en: {
        logoText: "GARAGE",
        mainTitle: "GARAGE",
        kicker: "Performance Enthusiasts",
        subTitle: "SPEED WORLD",
        selectCar: "Select Car",
        scrollText: "SCROLL TO EXPLORE",
        sectionTag: "CINEMATIC EXPERIENCE",
        sectionNum: "01 // EXPERIENCE",
        engineLabel: "ENGINE",
        hpLabel: "HORSEPOWER",
        accLabel: "ACCELERATION",
        priceLabel: "PRICE",
        cardDesc: "Engineered for unmatched performance on both track and street, combining luxury comfort with raw aggressive power.",
        specsTitle: "SPECIFICATIONS",
        engineSpec: "Engine",
        hpSpec: "Horsepower",
        accSpec: "Acceleration",
        currencyUSD: "USD 🇺🇸",
        currencyEGP: "EGP 🇪🇬",
        finalTitle: "OWN THE LEGEND",
        finalDesc: "Experience the ultimate driving machine today.",
        footerText: "All rights reserved",
        footerSub: "Luxury Car Experience"
    },
    ar: {
        logoText: "الجراج",
        mainTitle: "الجراج",
        kicker: "عشاق الأداء",
        subTitle: "عالم السرعة.",
        selectCar: "اختر السيارة",
        scrollText: "اسحب للأسفل للاستكشاف",
        sectionTag: "تجربة سينمائية",
        sectionNum: "01 // التجربة",
        engineLabel: "المحرك",
        hpLabel: "القصوى",
        accLabel: "التسارع",
        priceLabel: "السعر",
        cardDesc: "مصممة خصيصاً لأداء لا يُنسى على الحلبات وفي الشوارع، تجمع بين راحة الفخامة والقوة الهائلة.",
        specsTitle: "المواصفات",
        engineSpec: "المحرك",
        hpSpec: "القدرة الحصانية",
        accSpec: "التسارع",
        currencyUSD: "دولار 🇺🇸",
        currencyEGP: "جنيه 🇪🇬",
        finalTitle: "امتلك الأسطورة",
        finalDesc: "عش تجربة القيادة المطلقة اليوم.",
        footerText: "جميع الحقوق محفوظة",
        footerSub: "تجربة السيارات الفاخرة"
    }
};
// دالة لتغيير النصوص بناءً على اللغة الحالية
function updateStaticTexts() {
    const lang = document.documentElement.lang || "ar";
    const t = translations[lang];

    // 1. تحديث اللوجو (فوق)
    const garageLogo = document.getElementById("garageLogo");
    if (garageLogo) {
        garageLogo.innerHTML = `${t.logoText}<span class="dot">.</span>`;
    }

    // 2. تحديث كلمة "الجراج / GARAGE" الكبيرة في منتصف الشاشة
    const mainHeadingText = document.getElementById("mainHeadingText");
    if (mainHeadingText) {
        mainHeadingText.innerHTML = `${t.mainTitle}<span class="dot">.</span>`;
    }

    // 3. النصوص الثابتة في الهيرو
    const heroKicker = document.querySelector(".hero-kicker");
    if (heroKicker) heroKicker.textContent = t.kicker;

    const subTitle = document.querySelector(".sub-title");
    if (subTitle) subTitle.textContent = t.subTitle;

    const scrollText = document.querySelector(".scroll-indicator span");
    if (scrollText) scrollText.textContent = t.scrollText;

    // 4. قسم التجربة السينمائية (المنتصف)
    const sectionTag = document.querySelector(".section-tag");
    if (sectionTag) sectionTag.textContent = t.sectionTag;

    const sectionNum = document.querySelector(".section-number");
    if (sectionNum) sectionNum.textContent = t.sectionNum;

    const cardDesc = document.querySelector(".card-description");
    if (cardDesc) cardDesc.textContent = t.cardDesc;

    // تحديث زر العملة بناءً على اللغة
    updateCurrencyButton();

    // 4. تحديث التسميات التوضيحية للمواصفات في منتصف الصفحة (Engine, Horsepower, Acceleration, Price)
    const specLabels = document.querySelectorAll(".cinematic-spec .spec-label");
    if (specLabels.length >= 3) {
        specLabels[0].textContent = t.engineSpec;
        specLabels[1].textContent = t.hpSpec;
        specLabels[2].textContent = t.accSpec;
    }

    // 5. ترجمة كلمة "السعر" أو "PRICE" داخل الكارت
    const priceAreaSpan = document.querySelector(".price-area span");
    if (priceAreaSpan) {
        priceAreaSpan.textContent = t.priceLabel;
    }

    // 6. القسم الأخير
    const finalDetailsH2 = document.querySelector(".final-details h2");
    if (finalDetailsH2) finalDetailsH2.textContent = t.finalTitle;

    const finalDetailsP = document.querySelector(".final-details p");
    if (finalDetailsP) finalDetailsP.textContent = t.finalDesc;

    // تحديث زر العملة بناءً على اللغة
    updateCurrencyButton();
}
/* =====================================================
   CAR SELECTOR
===================================================== */

function populateCarSelector() {

    if (!carSelect || !window.carData) {
        return;
    }

    carSelect.innerHTML = "";

    Object.entries(window.carData).forEach(
        ([key, car]) => {

            const option =
                document.createElement("option");

            option.value = key;

            option.textContent =
                `${car.brand} ${car.model}`;

            option.selected =
                key === currentCarKey;

            carSelect.appendChild(option);
        }
    );
}


/* =====================================================
   UPDATE UI
===================================================== */

function updateCarUI() {

    const car = getCurrentCar();

    if (!car) {
        return;
    }

    const fullName =
        `${car.brand} ${car.model}`;


    if (cinematicBrand) {
        cinematicBrand.textContent = car.brand;
    }


    if (cinematicTitle) {
        cinematicTitle.textContent = car.model;
    }


    if (cinematicYear) {
        cinematicYear.textContent = car.year;
    }


    if (carTitle) {
        carTitle.textContent = fullName;
    }


    if (specEngine) {
        specEngine.textContent = car.engine;
    }


    if (specHp) {
        specHp.textContent = car.hp;
    }


    if (specAcc) {
        specAcc.textContent = car.acceleration;
    }


    if (carPrice) {
        carPrice.textContent = formatPrice(car);
    }


    if (storyPrice) {
        storyPrice.textContent = getShortPrice(car);
    }


    if (finalCarTitle) {
        finalCarTitle.textContent = fullName;
    }


    if (finalPrice) {
        finalPrice.textContent = formatPrice(car);
    }


    updateStoryData(car);
}


/* =====================================================
   STORY DATA
===================================================== */

function updateStoryData(car) {

    if (!car) {
        return;
    }


    if (storyEngine) {

        const value =
            storyEngine.querySelector("strong");

        if (value) {

            const engineMatch =
                String(car.engine)
                    .match(/V\d+/i);

            value.textContent =
                engineMatch
                    ? engineMatch[0]
                    : String(car.engine)
                        .split(" ")[0];
        }
    }


    if (storyPerformance) {

        const value =
            storyPerformance.querySelector("strong");

        if (value) {

            const hpNumber =
                String(car.hp)
                    .match(/\d+/);

            value.textContent =
                hpNumber
                    ? hpNumber[0]
                    : car.hp;
        }
    }


    if (storySpeed) {

        const value =
            storySpeed.querySelector("strong");

        if (value) {

            const acceleration =
                String(car.acceleration)
                    .match(/[\d.]+/);

            value.textContent =
                acceleration
                    ? acceleration[0]
                    : car.acceleration;
        }
    }


    if (storyPriceItem) {

        const small =
            storyPriceItem.querySelector("small");

        if (small) {

            small.textContent =
                isUSD
                    ? "USD"
                    : "EGP";
        }
    }
}


/* =====================================================
   CURRENCY
===================================================== */

function updateCurrencyButton() {
    if (!currencyToggle) {
        return;
    }
    const lang = document.documentElement.lang || "ar";
    
    if (lang === "ar") {
        currencyToggle.textContent = isUSD ? "دولار أمريكي 🇺🇸" : "جنيه مصري 🇪🇬";
    } else {
        currencyToggle.textContent = isUSD ? "USD 🇺🇸" : "EGP 🇪🇬";
    }
}


currencyToggle?.addEventListener(
    "click",
    () => {

        isUSD = !isUSD;

        updateCurrencyButton();

        updateCarUI();
    }
);


/* =====================================================
   LANGUAGE TOGGLE
===================================================== */

langToggle?.addEventListener(
    "click",
    () => {
        const isArabic = document.documentElement.lang === "ar";
        
        // تبديل اللغة والاتجاه
        document.documentElement.lang = isArabic ? "en" : "ar";
        document.documentElement.dir = isArabic ? "ltr" : "rtl";

        // تحديث نص الزر نفسه
        langToggle.textContent = isArabic ? "AR" : "EN";

        // تحديث جميع النصوص الثابتة في الموقع
        updateStaticTexts();
        
        // تحديث بيانات السيارة الحالية لضمان توافق العملة والوقت
        updateCarUI();
    }
);


/* =====================================================
   CAR SELECT
===================================================== */

carSelect?.addEventListener(
    "change",
    () => {

        const selected =
            carSelect.value;

        if (!window.carData?.[selected]) {
            return;
        }

        currentCarKey =
            selected;

        updateCarUI();

        loadCar(selected);
    }
);


/* =====================================================
   HERO WHEEL
===================================================== */

function initHeroWheel() {

    if (!bbsWheelImg) {
        return;
    }

    gsap.to(
        bbsWheelImg,
        {
            rotation: 360,
            duration: 18,
            repeat: -1,
            ease: "none"
        }
    );
}


/* =====================================================
   HERO FADE
===================================================== */

function initHeroFade() {

    const hero =
        document.querySelector(".hero-content");

    if (!hero) {
        return;
    }

    gsap.to(
        hero,
        {
            opacity: 0,
            y: -100,

            scrollTrigger: {

                trigger: ".hero-section",

                start: "top top",

                end: "80% top",

                scrub: 1
            }
        }
    );
}


/* =====================================================
   THREE INIT
===================================================== */

function initThree() {

    if (!car3DContainer) {

        console.error(
            "car3DContainer not found."
        );

        return;
    }


    scene =
        new THREE.Scene();


    scene.background =
        new THREE.Color(0x050505);


    const width =
        Math.max(
            car3DContainer.clientWidth,
            1
        );


    const height =
        Math.max(
            car3DContainer.clientHeight,
            1
        );


    camera =
        new THREE.PerspectiveCamera(
            32,
            width / height,
            0.01,
            1000
        );


    camera.position.set(
        0,
        1.8,
        6.5
    );


    renderer =
        new THREE.WebGLRenderer({

            /* FIX #4 — antialias بيكلف أضعاف الأداء على GPU
               الموبايل الضعيف. نقفله على isLowPower بس. */
            antialias: !isLowPower,

            alpha: true,

            powerPreference:
                "high-performance"
        });


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            /* FIX #5 — pixel ratio أعلى = رندر أتقل بشكل تربيعي.
               نقفله على 1.5 على الموبايل بدل 2-3. */
            isMobile ? 1.5 : 2
        )
    );


    renderer.setSize(
        width,
        height
    );


    renderer.outputColorSpace =
        THREE.SRGBColorSpace;


    renderer.toneMapping =
        THREE.ACESFilmicToneMapping;


    renderer.toneMappingExposure =
        1.15;


    /* FIX #6 — الظلال (shadow maps) من أتقل حاجات على
       الـGPU، وأغلب الفونات المتوسطة بتتهنق منها. نقفلها
       تماماً على الأجهزة الضعيفة. */
    renderer.shadowMap.enabled =
        !isLowPower;


    renderer.shadowMap.type =
        THREE.PCFSoftShadowMap;


    /* FIX #7 — لو الـGPU فقد الـWebGL context (بيحصل
       كتير على فونات الرام القليلة لما تكون فاتح تابات
       تانية)، الموقع كان بيفضل شاشة سودا مكسورة للأبد.
       دلوقتي بنمسك الحدث ونعيد بناء المشهد. */
    renderer.domElement.addEventListener(
        "webglcontextlost",
        (event) => {
            event.preventDefault();
            console.warn("WebGL context lost — إعادة المحاولة…");
            cancelAnimationFrame(rafId);
        },
        false
    );

    renderer.domElement.addEventListener(
        "webglcontextrestored",
        () => {
            console.warn("WebGL context restored — إعادة تحميل المشهد.");
            initThree();
            loadCar(currentCarKey);
        },
        false
    );


    car3DContainer.innerHTML = "";

    car3DContainer.appendChild(
        renderer.domElement
    );


    car3DContainer.style.pointerEvents =
        "auto";

    car3DContainer.style.touchAction =
        "none";


    renderer.domElement.style.pointerEvents =
        "auto";

    renderer.domElement.style.touchAction =
        "none";

    renderer.domElement.style.cursor =
        "grab";


    /* =================================================
       LIGHTING
    ================================================= */

    const ambientLight =
        new THREE.AmbientLight(
            0xffffff,
            1.8
        );

    scene.add(ambientLight);


    const keyLight =
        new THREE.DirectionalLight(
            0xffffff,
            3.5
        );

    keyLight.position.set(
        5,
        7,
        6
    );

    /* FIX #6 (تكملة) — نفس السبب: castShadow على لايت واحد
       بس كفاية يخلي الرندر تلات أو أربع أضعاف أتقل. */
    keyLight.castShadow =
        !isLowPower;

    if (keyLight.castShadow) {
        keyLight.shadow.mapSize.set(1024, 1024);
    }

    scene.add(keyLight);


    const fillLight =
        new THREE.DirectionalLight(
            0xffcc66,
            2.5
        );

    fillLight.position.set(
        -5,
        3,
        4
    );

    scene.add(fillLight);


    const rimLight =
        new THREE.DirectionalLight(
            0xffc400,
            3
        );

    rimLight.position.set(
        -4,
        4,
        -6
    );

    scene.add(rimLight);


    const goldPoint =
        new THREE.PointLight(
            0xffb300,
            8,
            12
        );

    goldPoint.position.set(
        0,
        2.5,
        -1.5
    );

    scene.add(goldPoint);


    /* =================================================
       FLOOR
    ================================================= */

    const floorGeometry =
        new THREE.CircleGeometry(
            5,
            64
        );


    const floorMaterial =
        new THREE.MeshStandardMaterial({

            color: 0x030303,

            roughness: 0.85,

            metalness: 0.15
        });


    currentFloor =
        new THREE.Mesh(
            floorGeometry,
            floorMaterial
        );


    currentFloor.rotation.x =
        -Math.PI / 2;


    currentFloor.position.y =
        0;


    currentFloor.receiveShadow =
        !isLowPower;


    scene.add(currentFloor);


    initCarMouseRotation();


    /* FIX #8 — resize كان بيتنادى مباشرة من غير debounce.
       على الموبايل، أي رجفة في شريط العنوان كانت بتطلق
       عشرات نداءات resize في الثانية وتخلي الرندر يهنج.
       الـdebounce بيخلي الحساب يحصل مرة واحدة بس لما
       المستخدم يوقف عن تغيير حجم الشاشة فعلاً. */
    window.addEventListener(
        "resize",
        debounce(resizeThree, 150)
    );

    window.addEventListener(
        "orientationchange",
        () => setTimeout(() => {
            resizeThree();
            ScrollTrigger.refresh();
        }, 250)
    );


    animate();
}


/* =====================================================
   CAR MOUSE ROTATION
===================================================== */

function initCarMouseRotation() {

    if (!renderer?.domElement) {
        return;
    }


    const canvas =
        renderer.domElement;


    canvas.addEventListener(
        "pointerdown",
        (event) => {

            if (
                event.pointerType === "mouse" &&
                event.button !== 0
            ) {
                return;
            }


            if (!currentModel) {
                return;
            }


            isDraggingCar =
                true;


            previousMouseX =
                event.clientX;


            canvas.style.cursor =
                "grabbing";


            canvas.setPointerCapture(
                event.pointerId
            );
        }
    );


    canvas.addEventListener(
        "pointermove",
        (event) => {

            if (
                !isDraggingCar ||
                !currentModel
            ) {
                return;
            }


            const currentMouseX =
                event.clientX;


            const deltaX =
                currentMouseX -
                previousMouseX;


            previousMouseX =
                currentMouseX;


            targetCarRotationY +=
                deltaX *
                mouseRotationSpeed;
        }
    );


    const stopDragging =
        (event) => {

            if (!isDraggingCar) {
                return;
            }


            isDraggingCar =
                false;


            canvas.style.cursor =
                "grab";


            try {

                canvas.releasePointerCapture(
                    event.pointerId
                );

            } catch (error) {}
        };


    canvas.addEventListener(
        "pointerup",
        stopDragging
    );


    canvas.addEventListener(
        "pointercancel",
        stopDragging
    );


    canvas.addEventListener(
        "contextmenu",
        (event) => {

            event.preventDefault();
        }
    );
}


/* =====================================================
   RESIZE
===================================================== */

function resizeThree() {

    if (
        !renderer ||
        !camera ||
        !car3DContainer
    ) {
        return;
    }


    const width =
        Math.max(
            car3DContainer.clientWidth,
            1
        );


    const height =
        Math.max(
            car3DContainer.clientHeight,
            1
        );


    camera.aspect =
        width / height;


    camera.updateProjectionMatrix();


    renderer.setSize(
        width,
        height
    );


    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );
}


/* =====================================================
   ANIMATION
===================================================== */

function animate() {

    rafId = requestAnimationFrame(
        animate
    );


    if (currentModel) {

        currentModel.rotation.y =
            THREE.MathUtils.lerp(
                currentModel.rotation.y,
                targetCarRotationY,
                0.12
            );
    }


    if (
        renderer &&
        scene &&
        camera
    ) {

        renderer.render(
            scene,
            camera
        );
    }
}


/* =====================================================
   REAL GLB HEADLIGHT DETECTION
===================================================== */

/*
   هنا لا نضيف أي SpotLight أو PointLight.

   النظام يبحث داخل الـGLB نفسه عن:
   - headlight
   - headlamp
   - front light
   - lamp
   - LED
   - beam
   - light

   ويفحص الـMaterial والـEmissive.

   بعد ذلك يشغل الـMesh الحقيقي نفسه.
*/


function clearHeadlights() {

    if (headlightTimer) {

        clearTimeout(
            headlightTimer
        );

        headlightTimer =
            null;
    }


    if (headlightAnimation) {

        headlightAnimation.kill();

        headlightAnimation =
            null;
    }


    headlightMeshes = [];
}


/* =====================================================
   HEADLIGHT SCORE
===================================================== */

function getHeadlightScore(mesh) {

    if (!mesh?.isMesh) {
        return 0;
    }

    let score = 0;

    const meshName =
        String(
            mesh.name || ""
        ).toLowerCase();

    const materialList =
        Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];

    const materialNames =
        materialList
            .map(
                material =>
                    String(
                        material?.name || ""
                    ).toLowerCase()
            )
            .join(" ");

    /* -----------------------------------------------
       STRONG NAME MATCH (تشمل الأمامي والخلفي للـ BMW)
    ----------------------------------------------- */

    const strongKeywords = [
        "headlight",
        "headlamp",
        "head_light",
        "head_lamp",
        "frontlight",
        "frontlamp",
        "front_light",
        "front_lamp",
        "lowbeam",
        "low_beam",
        "highbeam",
        "high_beam",
        "reartail",
        "rearligh",
        "rear_ligh",
        "lightemissive",
        "blinkerfront",
        "blinker",
        "redg",
        "rearred",
        "lightbutton",
        "amlight",
        "angel",
        "drl"
    ];

    strongKeywords.forEach(
        keyword => {
            if (
                meshName.includes(keyword)
            ) {
                score += 100;
            }

            if (
                materialNames.includes(keyword)
            ) {
                score += 80;
            }
        }
    );

    /* -----------------------------------------------
       GENERAL LIGHT NAME
    ----------------------------------------------- */

    const generalKeywords = [
        "lamp",
        "light",
        "led",
        "beam",
        "tail",
        "front"
    ];

    generalKeywords.forEach(
        keyword => {
            if (
                meshName.includes(keyword)
            ) {
                score += 30;
            }

            if (
                materialNames.includes(keyword)
            ) {
                score += 20;
            }
        }
    );

    /* -----------------------------------------------
       EMISSIVE MATERIAL
    ----------------------------------------------- */

    materialList.forEach(
        material => {
            if (!material) {
                return;
            }

            if (material.emissive) {
                const e = material.emissive;
                const brightness = e.r + e.g + e.b;

                if (brightness > 0.05) {
                    score += 40;
                }
                if (brightness > 0.3) {
                    score += 25;
                }
            }

            if (material.emissiveMap) {
                score += 30;
            }

            if (
                material.transmission > 0 ||
                material.opacity < 1
            ) {
                score += 5;
            }
        }
    );

    return score;
}

/* =====================================================
   DETECT REAL HEADLIGHTS
===================================================== */

function detectRealHeadlights(model) {

    headlightMeshes = [];

    if (!model) {
        return;
    }

    const candidates = [];

    model.traverse(
        (child) => {
            if (!child.isMesh) {
                return;
            }

            const score = getHeadlightScore(child);
            const meshName = String(child.name || "").toLowerCase();

            // إضافة استثناء مباشر للأجزاء الأمامية في سيارات الـ BMW لو وُجدت
            let forcedScore = score;
            if (
                meshName.includes("blinkerfront") || 
                meshName.includes("front") || 
                meshName.includes("light") || 
                meshName.includes("lamp") ||
                meshName.includes("head")
            ) {
                forcedScore += 100; // رفع النقاط قسراً لتلتقطها الأجزاء الأمامية
            }

            candidates.push({
                mesh: child,
                score: forcedScore,
                name: child.name || "(unnamed)",
                material: Array.isArray(child.material)
                    ? child.material.map(m => m?.name || "(unnamed)").join(", ")
                    : child.material?.name || "(unnamed)"
            });
        }
    );

    candidates.sort((a, b) => b.score - a.score);

    // تصفية الأجزاء واختيار أعلى النتائج (زيادة العدد ليشمل الأمامي والخلفي)
    const detected = candidates
        .filter(item => item.score >= 30) // تقليل الشرط لضمان دخول الفوانيس الأمامية
        .slice(0, 20);

    detected.forEach(item => {
        if (!headlightMeshes.includes(item.mesh)) {
            headlightMeshes.push(item.mesh);
        }
    });

    console.log(
        "💡 REAL HEADLIGHT MESHES (Updated):",
        headlightMeshes.map(mesh => mesh.name)
    );

    // تجهيز وخامات الأجزاء المكتشفة
    headlightMeshes.forEach(mesh => {
        if (!mesh.material) {
            return;
        }

        const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];

        mesh.material = materials.map(material => {
            if (!material) {
                return material;
            }

            const clone = material.clone();

            clone.userData = {
                ...(clone.userData || {}),
                originalEmissive: clone.emissive
                    ? clone.emissive.clone()
                    : new THREE.Color(0x000000),
                originalEmissiveIntensity: "emissiveIntensity" in clone
                    ? clone.emissiveIntensity
                    : 1,
            };

            if (clone.emissive) {
                clone.emissive.set(0x000000);
            }

            if ("emissiveIntensity" in clone) {
                clone.emissiveIntensity = 0;
            }

            clone.needsUpdate = true;
            return clone;
        });
    });


    if (
        headlightMeshes.length === 0
    ) {

        console.warn(
            "⚠️ لم يتم العثور على فوانيس حقيقية داخل الـGLB."
        );

    } else {

        console.log(
            `✅ تم العثور على ${headlightMeshes.length} جزء محتمل للفوانيس.`
        );
    }
}


/* =====================================================
   HEADLIGHTS OFF
===================================================== */

function headlightsOff() {

    headlightMeshes.forEach(
        mesh => {

            if (!mesh.material) {
                return;
            }


            const materials =
                Array.isArray(
                    mesh.material
                )
                    ? mesh.material
                    : [mesh.material];


            materials.forEach(
                material => {

                    if (!material) {
                        return;
                    }


                    if (
                        material.emissive
                    ) {

                        material.emissive.set(
                            0x000000
                        );
                    }


                    if (
                        "emissiveIntensity"
                        in material
                    ) {

                        material.emissiveIntensity =
                            0;
                    }


                    material.needsUpdate =
                        true;
                }
            );
        }
    );
}


/* =====================================================
   HEADLIGHTS ON
===================================================== */

function headlightsOn() {

    if (!currentModel) {
        return;
    }

    if (headlightMeshes.length === 0) {
        console.warn("⚠️ لا يوجد Headlight Mesh لتشغيله.");
        return;
    }

    if (headlightAnimation) {
        headlightAnimation.kill();
    }

    const state = { power: 0 };

    headlightAnimation = gsap.to(state, {
        power: 1,
        duration: 0.75,
        ease: "power2.out",
        onUpdate: () => {
            headlightMeshes.forEach(mesh => {
                if (!mesh.material) {
                    return;
                }

                const materials = Array.isArray(mesh.material)
                    ? mesh.material
                    : [mesh.material];

                materials.forEach(material => {
                    if (!material) {
                        return;
                    }

                    // التحويل القسري لإضاءة ساطعة
                    const name = String(mesh.name || "").toLowerCase();
                    
                    if (name.includes("rear") || name.includes("tail") || name.includes("red")) {
                        material.color.set(0xff0000);
                        if ('emissive' in material) {
                            material.emissive.set(0xff0000);
                            material.emissiveIntensity = state.power * 10;
                        }
                    } else {
                        material.color.set(0xffffff);
                        if ('emissive' in material) {
                            material.emissive.set(0xffffff);
                            material.emissiveIntensity = state.power * 15;
                        }
                    }

                    material.needsUpdate = true;
                });
            });
        }
    });
}

/* =====================================================
   HEADLIGHT STARTUP
===================================================== */

function startHeadlightStartup(model) {

    if (!model) {
        return;
    }


    /*
       نفحص الـGLB الحقيقي
    */

    detectRealHeadlights(
        model
    );


    /*
       نبدأ والفوانيس OFF
    */

    headlightsOff();


    /*
       ننتظر ثانية
    */

    headlightTimer =
        setTimeout(
            () => {

                if (
                    currentModel !== model
                ) {
                    return;
                }


                console.log(
                    "🚗 ENGINE STARTED — REAL HEADLIGHTS ON"
                );


                headlightsOn();

            },
            1000
        );
}


/* =====================================================
   NORMALIZE MODEL
===================================================== */

function normalizeModel(model) {

    if (!model) {
        return null;
    }


    const box =
        new THREE.Box3()
            .setFromObject(model);


    const size =
        box.getSize(
            new THREE.Vector3()
        );


    const center =
        box.getCenter(
            new THREE.Vector3()
        );


    const maxSize =
        Math.max(
            size.x,
            size.y,
            size.z
        );


    if (
        !maxSize ||
        !isFinite(maxSize)
    ) {

        console.warn(
            "Invalid model size."
        );

        return null;
    }


    /*
       Center
    */

    model.position.x -=
        center.x;


    model.position.z -=
        center.z;


    model.position.y -=
        center.y;


    /*
       Move LEFT
    */

    model.position.x -=
        0.45;


    /*
       Scale
    */

    const targetSize =
        3.8;


    const scale =
        targetSize /
        maxSize;


    model.scale.setScalar(
        scale
    );


    /*
       Floor
    */

    let newBox =
        new THREE.Box3()
            .setFromObject(model);


    model.position.y -=
        newBox.min.y;


    model.position.y +=
        0.06;


    /*
       Initial rotation
    */

    targetCarRotationY =
        -0.35;


    model.rotation.y =
        -0.35;


    console.log(
        "3D CAR NORMALIZED",
        {
            size,
            scale
        }
    );


    return {
        scale,
        size
    };
}


/* =====================================================
   FRAME CAMERA
===================================================== */

function frameCamera(model) {

    if (!model || !camera) {
        return;
    }


    const box =
        new THREE.Box3()
            .setFromObject(model);


    const size =
        box.getSize(
            new THREE.Vector3()
        );


    const center =
        box.getCenter(
            new THREE.Vector3()
        );


    const maxSize =
        Math.max(
            size.x,
            size.y,
            size.z
        );


    const distance =
        THREE.MathUtils.clamp(
            maxSize * 1.65,
            5.8,
            7.2
        );


    camera.position.set(
        0,
        center.y +
            maxSize * 0.10,
        distance
    );


    camera.lookAt(
        new THREE.Vector3(
            0,
            center.y +
                maxSize * 0.02,
            0
        )
    );
}


/* =====================================================
   DISPOSE
===================================================== */

function disposeModel(model) {

    if (!model) {
        return;
    }


    model.traverse(
        child => {

            if (!child.isMesh) {
                return;
            }


            child.geometry?.dispose();


            if (
                Array.isArray(
                    child.material
                )
            ) {

                child.material.forEach(
                    material => {

                        material?.dispose();
                    }
                );

            } else {

                child.material?.dispose();
            }
        }
    );
}


/* =====================================================
   LOAD CAR
===================================================== */

function loadCar(
    carKey = currentCarKey
) {

    const car =
        window.carData?.[carKey];


    if (!car) {

        console.error(
            "Car not found:",
            carKey
        );

        return;
    }


    /*
       Clear old headlights
    */

    clearHeadlights();


    /*
       Remove old model
    */

    if (currentModel) {

        scene.remove(
            currentModel
        );


        disposeModel(
            currentModel
        );


        currentModel =
            null;
    }


    /*
       Reset rotation
    */

    targetCarRotationY =
        -0.35;


    /*
       No 3D model
    */

    if (!car.model3D) {

        console.warn(
            `No 3D model for ${car.brand} ${car.model}`
        );

        return;
    }


    /*
       Loading animation
    */

    gsap.killTweensOf(
        car3DContainer
    );


    gsap.set(
        car3DContainer,
        {
            opacity: 0,
            scale: 1
        }
    );


    /*
       Load GLB
    */

    loader.load(

        car.model3D,

        gltf => {

            const model =
                gltf.scene;


            /*
               Normalize
            */

            const normalized =
                normalizeModel(
                    model
                );


            if (!normalized) {

                console.error(
                    "Could not normalize car."
                );

                return;
            }


            /*
               Add model
            */

            scene.add(
                model
            );


            currentModel =
                model;


            /*
               Shadows
            */

            model.traverse(
                child => {

                    if (!child.isMesh) {
                        return;
                    }


                    /* FIX #6 (تكملة) — نفس منطق تقليل
                       تكلفة الظلال على الأجهزة الضعيفة،
                       بس هنا على كل قطعة في الموديل نفسه. */
                    child.castShadow =
                        !isLowPower;


                    child.receiveShadow =
                        !isLowPower;


                    if (
                        child.material
                    ) {

                        const materials =
                            Array.isArray(
                                child.material
                            )
                                ? child.material
                                : [child.material];


                        materials.forEach(
                            material => {

                                if (
                                    material
                                ) {

                                    material.envMapIntensity =
                                        1.25;
                                }
                            }
                        );
                    }
                }
            );


            /*
               Camera
            */

            frameCamera(
                model
            );


            /*
               REAL HEADLIGHT SYSTEM
            */

            startHeadlightStartup(
                model
            );


            /*
               Scale animation
            */

            const finalScale =
                normalized.scale;


            model.scale.setScalar(
                finalScale * 0.88
            );


            gsap.to(
                model.scale,
                {

                    x: finalScale,

                    y: finalScale,

                    z: finalScale,

                    duration: 1.1,

                    ease: "power3.out"
                }
            );


            /*
               Rotation
            */

            gsap.to(
                model.rotation,
                {

                    y: -0.35,

                    duration: 1.1,

                    ease: "power3.out"
                }
            );


            /*
               Fade in
            */

            gsap.to(
                car3DContainer,
                {

                    opacity: 1,

                    duration: 0.8,

                    ease: "power2.out"
                }
            );


            const oldError = car3DContainer?.querySelector(".model-error-msg");
            if (oldError) oldError.remove();

            console.log(
                "CAR LOADED:",
                car.brand,
                car.model
            );
        },


        progress => {

            if (!progress.total) {
                return;
            }


            const percent =
                (
                    progress.loaded /
                    progress.total
                ) * 100;


            console.log(
                `Loading ${car.brand} ${car.model}: ${percent.toFixed(0)}%`
            );
        },


        error => {

            console.error(
                "3D model loading error:",
                error
            );


            currentModel =
                null;


            gsap.to(
                car3DContainer,
                {

                    opacity: 0,

                    duration: 0.3
                }
            );

            /* FIX #9 — قبل كده لما الموديل يفشل يحمل
               (رابط غلط، ملف كبير جداً، أو الملف مش
               موجود فعلاً على Vercel)، الشاشة كانت
               تفضل سودا من غير أي رسالة، وده بالظبط
               اللي بيبان للمستخدم إنه "كل حاجة بايظة".
               دلوقتي بنكتب رسالة واضحة بدل السكوت. */
            if (car3DContainer) {
                const old = car3DContainer.querySelector(".model-error-msg");
                if (old) old.remove();

                const msg = document.createElement("div");
                msg.className = "model-error-msg";
                msg.style.cssText =
                    "position:absolute;inset:0;display:flex;align-items:center;" +
                    "justify-content:center;text-align:center;color:#888;" +
                    "font-size:.85rem;padding:20px;pointer-events:none;z-index:5;";
                msg.textContent =
                    `تعذّر تحميل موديل ${car.brand} ${car.model} — تأكد إن رابط ` +
                    `الملف صحيح ومرفوع فعلاً ضمن الموقع على Vercel.`;
                car3DContainer.appendChild(msg);
            }
        }
    );
}


/* =====================================================
   CINEMATIC SCROLL
===================================================== */

function initCinematicScroll() {

    if (!carExperience) {
        return;
    }


    if (cinematicTimeline) {

        cinematicTimeline.kill();

        cinematicTimeline =
            null;
    }


    ScrollTrigger.getAll()
        .forEach(
            trigger => {

                if (
                    trigger.trigger ===
                    carExperience
                ) {

                    trigger.kill();
                }
            }
        );


    gsap.set(
        garageLogo,
        {

            clearProps: "transform",

            opacity: 1,

            scale: 1,

            x: 0,

            y: 0
        }
    );


    gsap.set(
        ".car-title-overlay",
        {

            opacity: 0,

            y: 35,

            x: 0,

            scale: 1
        }
    );


    gsap.set(
        cinematicCard,
        {

            opacity: 0,

            x: 100
        }
    );


    gsap.set(
        [
            storyEngine,
            storyPerformance,
            storySpeed,
            storyPriceItem
        ],
        {

            opacity: 0,

            x: -100
        }
    );


    gsap.set(
        car3DContainer,
        {

            opacity: 1,

            scale: 1
        }
    );


    gsap.set(
        finalDetails,
        {

            opacity: 0,

            y: 60
        }
    );


    cinematicTimeline =
        gsap.timeline({

            scrollTrigger: {

                trigger:
                    carExperience,

                start:
                    "top top",

                /* FIX #10 — "+=5600" ثابت كان بيدي نفس مسافة
                   السكرول الطويلة على شاشة موبايل صغيرة زي ما
                   بيديها على شاشة ديسكتوب كبيرة، فالتجربة كانت
                   تحس إنها بطيئة وثقيلة جداً على الفون. دلوقتي
                   المسافة بتتحسب من ارتفاع الشاشة الفعلي، وGSAP
                   بيعيد حسابها لوحده مع invalidateOnRefresh. */
                end:
                    () => (isMobile ? "+=3200" : "+=5600"),

                scrub:
                    1,

                pin:
                    true,

                anticipatePin:
                    1,

                invalidateOnRefresh:
                    true
            }
        });


    /*
       LOGO
    */

    cinematicTimeline.to(
        garageLogo,
        {

            opacity: 0,

            scale: 0.92,

            duration: 0.8,

            ease: "power2.out"
        }
    );


    /*
       TITLE
    */

    cinematicTimeline.to(
        ".car-title-overlay",
        {

            opacity: 1,

            y: 0,

            duration: 0.9,

            ease: "power3.out"
        }
    );


    cinematicTimeline.to(
        {},
        {
            duration: 0.45
        }
    );


    cinematicTimeline.to(
        ".car-title-overlay",
        {

            opacity: 0,

            y: -25,

            scale: 0.97,

            duration: 0.75,

            ease: "power2.inOut"
        }
    );


    /*
       CARD
    */

    cinematicTimeline.to(
        cinematicCard,
        {

            opacity: 1,

            x: 0,

            duration: 0.9,

            ease: "power3.out"
        }
    );


    cinematicTimeline.to(
        {},
        {
            duration: 0.35
        }
    );


    /*
       ENGINE
    */

    cinematicTimeline.to(
        storyEngine,
        {

            opacity: 1,

            x: 0,

            duration: 0.65,

            ease: "power3.out"
        }
    );


    cinematicTimeline.to(
        storyEngine,
        {

            opacity: 0,

            x: -100,

            duration: 0.55,

            ease: "power2.in"
        }
    );


    /*
       PERFORMANCE
    */

    cinematicTimeline.to(
        storyPerformance,
        {

            opacity: 1,

            x: 0,

            duration: 0.65,

            ease: "power3.out"
        }
    );


    cinematicTimeline.to(
        storyPerformance,
        {

            opacity: 0,

            x: -100,

            duration: 0.55,

            ease: "power2.in"
        }
    );


    /*
       SPEED
    */

    cinematicTimeline.to(
        storySpeed,
        {

            opacity: 1,

            x: 0,

            duration: 0.65,

            ease: "power3.out"
        }
    );


    cinematicTimeline.to(
        storySpeed,
        {

            opacity: 0,

            x: -100,

            duration: 0.55,

            ease: "power2.in"
        }
    );


    /*
       PRICE
    */

    cinematicTimeline.to(
        storyPriceItem,
        {

            opacity: 1,

            x: 0,

            duration: 0.65,

            ease: "power3.out"
        }
    );


    cinematicTimeline.to(
        storyPriceItem,
        {

            opacity: 0,

            x: -100,

            duration: 0.55,

            ease: "power2.in"
        }
    );


    /*
       CARD OUT
    */

    cinematicTimeline.to(
        cinematicCard,
        {

            opacity: 0,

            x: 100,

            duration: 0.75,

            ease: "power2.inOut"
        }
    );


    /*
       CAR OUT
    */

    cinematicTimeline.to(
        car3DContainer,
        {

            opacity: 0,

            scale: 0.82,

            duration: 1,

            ease: "power3.inOut"
        }
    );


    /*
       FINAL
    */

    cinematicTimeline.to(
        finalDetails,
        {

            opacity: 1,

            y: 0,

            duration: 1,

            ease: "power3.out"
        }
    );


    ScrollTrigger.refresh();
}


/* =====================================================
   INIT
===================================================== */

function init() {

    if (!window.carData) {

        console.error(
            "window.carData is not available."
        );

        return;
    }


    populateCarSelector();

    updateCurrencyButton();

    updateCarUI();


    initHeroWheel();

    initHeroFade();


    initThree();


    loadCar(
        currentCarKey
    );


    initCinematicScroll();
}


/* =====================================================
   START
===================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();
}

/* =====================================================
   FIX #11 — تحديث حسابات الـScrollTrigger بعد ما كل
   حاجة (خطوط، صور) تخلص تحميل فعلياً.
   لو الخط أو صورة العجلة اتحمّلت متأخر شوية بعد ما
   ScrollTrigger حسب أماكن الأقسام، الارتفاعات بتتغيّر
   من تحته وهو مش عارف — فبتحصل نفس مشكلة "كل حاجة
   بتدخل في بعض" حتى من غير أي مشكلة في الموبايل نفسه.
===================================================== */
window.addEventListener("load", () => {
    setTimeout(() => ScrollTrigger.refresh(), 300);
});
