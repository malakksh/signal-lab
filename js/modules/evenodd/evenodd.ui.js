 (function () {

  // Function بترجع الجزء المسؤول عن العمليات الرياضية
  // الخاصة بتقسيم الإشارة إلى Even و Odd.
  const MATH = function () {
    return SignalLab.math.evenodd;
  };

  // تخزين الألوان المستخدمة في رسم الإشارات.
  const COLORS = SignalLab.plot.COLORS;

  // أسماء الحقول الموجودة في واجهة المستخدم.
  // بنستخدمها للوصول إلى كل حقل وعرض رسائل الخطأ الخاصة بيه.
  const FIELD_NAMES = ["type", "amplitude", "frequency", "phase", "halfWidth"];


  // تحديد الاسم الظاهر لكل نوع من أنواع الإشارات.
  const TYPE_LABELS = {
    sine: "Sine wave",
    cosine: "Cosine wave",
    square: "Square wave"
  };


  // القيم الافتراضية المستخدمة عند فتح البرنامج.
  const DEFAULTS = {

    // القيم الافتراضية في حالة Continuous.
    continuous: {
      frequency: 1,
      halfWidth: 2,
      slider: {
        min: 0.1,
        max: 10,
        step: 0.1
      }
    },

    // القيم الافتراضية في حالة Discrete.
    discrete: {
      frequency: 0.05,
      halfWidth: 20,
      slider: {
        min: 0.01,
        max: 0.5,
        step: 0.01
      }
    }
  };


  // تحديد قيمة Phase الافتراضية.
  const DEFAULT_PHASE = 0.785;


  // Function بتجيب عنصر من HTML باستخدام الـ ID بتاعه.
  // بدل ما نكتب document.getElementById كل مرة.
  function $(id) {
    return document.getElementById(id);
  }


  // Function مسؤولة عن تنسيق الأرقام قبل عرضها.
  function formatNumber(value) {

    // لو الرقم قريب جداً من الصفر بنعرضه صفر.
    if (Math.abs(value) < 1e-9) {
      return "0";
    }

    // بنقلل عدد الخانات المعروضة إلى 6 خانات مهمة.
    return String(Number(value.toPrecision(6)));
  }


  // Function بتنسق قيمة الخطأ لعرضها بشكل مختصر.
  function formatError(value) {

    // لو الخطأ صفر بنعرض صفر.
    // غير كده بنعرضه باستخدام Scientific Notation.
    return value === 0 ? "0" : value.toExponential(1);
  }


  // Function بتنشئ HTML لحقل إدخال يحتوي على:
  // عنوان، Input عادي، Slider، تعليمات، ورسالة خطأ.
  function sliderFieldHtml(name, label, value, min, max, step, hint, extraHtml) {

    return '<div class="field" id="eo-' + name + '-field">' +

             // إنشاء اسم الحقل.
             '<label for="eo-' + name + '">' + label + '</label>' +

             // إنشاء مربع إدخال الرقم.
             '<input type="number" id="eo-' + name + '" step="any" value="' + value + '">' +

             // إنشاء Slider للتحكم في القيمة.
             '<input type="range" id="eo-' + name + '-slider" aria-label="' + label + ' slider"' +
                 ' min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +

             // عرض تعليمات للمستخدم.
             '<p class="field-hint" id="eo-' + name + '-hint">' + hint + '</p>' +

             // إضافة أي عناصر HTML إضافية لو موجودة.
             (extraHtml || '') +

             // مكان عرض رسالة الخطأ.
             '<p class="field-error" id="eo-' + name + '-error" role="alert"></p>' +

           '</div>';
  }


  // Function مسؤولة عن إنشاء جميع عناصر التحكم في الصفحة.
  // زي اختيار نوع الإشارة والـ Mode والـ Amplitude والـ Frequency والـ Phase.
  function buildControls() {

    // الحصول على القيم الافتراضية الخاصة بالـ Continuous Mode.
    const d = DEFAULTS.continuous;


    // إنشاء أزرار جاهزة لاختيار قيم مختلفة للـ Phase.
    const phasePresets =

      '<div class="btn-row" aria-label="Phase presets">' +

        // زر لاختيار Phase = 0.
        '<button type="button" class="btn btn-small" data-phase="0">0</button>' +

        // زر لاختيار Phase = π/2.
        '<button type="button" class="btn btn-small" data-phase="' + Math.PI / 2 + '">π/2</button>' +

        // زر لاختيار Phase = π.
        '<button type="button" class="btn btn-small" data-phase="' + Math.PI + '">π</button>' +

        // زر لاختيار Phase = -π/2.
        '<button type="button" class="btn btn-small" data-phase="' + (-Math.PI / 2) + '">−π/2</button>' +

      '</div>';


    // إضافة جميع عناصر التحكم داخل العنصر الموجود في HTML.
    $("evenodd-controls").innerHTML =

      // إنشاء قائمة اختيار نوع الإشارة.
      '<div class="field">' +
        '<label for="eo-type">Original signal</label>' +
        '<select id="eo-type">' +

          // اختيار Sine.
          '<option value="sine">Sine wave</option>' +

          // اختيار Cosine.
          '<option value="cosine">Cosine wave</option>' +

          // اختيار Square.
          '<option value="square">Square wave</option>' +

        '</select>' +

        // مكان عرض خطأ نوع الإشارة.
        '<p class="field-error" id="eo-type-error" role="alert"></p>' +
      '</div>' +


      // إنشاء اختيار نوع التمثيل.
      // المستخدم يقدر يختار Continuous أو Discrete.
      '<div class="field">' +
        '<span class="field-label" id="eo-mode-label">Representation</span>' +

        '<div class="segmented" role="radiogroup" aria-labelledby="eo-mode-label">' +

          // اختيار Continuous وهو الوضع الافتراضي.
          '<input type="radio" name="eo-mode" id="eo-mode-continuous" value="continuous" checked>' +
          '<label for="eo-mode-continuous">Continuous</label>' +

          // اختيار Discrete.
          '<input type="radio" name="eo-mode" id="eo-mode-discrete" value="discrete">' +
          '<label for="eo-mode-discrete">Discrete</label>' +

        '</div>' +
      '</div>' +


      // إنشاء حقل Amplitude باستخدام Function السابقة.
      sliderFieldHtml(
        "amplitude",
        "Amplitude (A)",
        1,
        0.1,
        3,
        0.1,
        "How tall the wave is."
      ) +


      // إنشاء حقل Frequency.
      sliderFieldHtml(
        "frequency",
        "Frequency (f), in Hz",
        d.frequency,
        d.slider.min,
        d.slider.max,
        d.slider.step,
        "Cycles per second."
      ) +


      // إنشاء حقل Phase مع أزرار القيم الجاهزة.
      sliderFieldHtml(
        "phase",
        "Phase (φ), in radians",
        DEFAULT_PHASE,
        -6.28,
        6.28,
        0.01,
        "Shifts the wave in time. π ≈ 3.14159. Try 0 and π/2.",
        phasePresets
      ) +


      // إنشاء حقل Range.
      '<div class="control-group">' +
        '<div class="field" id="eo-halfWidth-field">' +

          // اسم الحقل.
          '<label for="eo-halfWidth" id="eo-halfWidth-label">Range T (s)</label>' +

          // مربع إدخال قيمة Range.
          '<input type="number" id="eo-halfWidth" step="any" value="' + d.halfWidth + '">' +

          // شرح المدى المستخدم في الرسم.
          '<p class="field-hint" id="eo-halfWidth-hint">The plots run from −T to T, always symmetric around 0.</p>' +

          // مكان عرض خطأ Range.
          '<p class="field-error" id="eo-halfWidth-error" role="alert"></p>' +

        '</div>' +
      '</div>';
  }


  // Function بتحدد الوضع الحالي الذي اختاره المستخدم.
  // بترجع Continuous أو Discrete.
  function currentMode() {

    // بنبحث عن زر الاختيار المحدد حالياً ونرجع قيمته.
    return document.querySelector(
      'input[name="eo-mode"]:checked'
    ).value;
  }


  // Function مسؤولة عن قراءة جميع القيم التي أدخلها المستخدم.
  function readInputs() {

    // بترجع Object يحتوي على جميع المدخلات.
    return {

      // نوع الإشارة.
      type: $("eo-type").value,

      // نوع الـ Mode.
      mode: currentMode(),

      // قيمة Amplitude.
      amplitude: $("eo-amplitude").value,

      // قيمة Frequency.
      frequency: $("eo-frequency").value,

      // قيمة Phase.
      phase: $("eo-phase").value,

      // قيمة Range.
      halfWidth: $("eo-halfWidth").value
    };
  }


  // Function بتغير إعدادات الواجهة حسب الوضع المختار.
  // يعني لو المستخدم اختار Discrete بتغير أسماء الحقول والقيم والحدود.
  function applyMode(mode) {

    // الحصول على الإعدادات الافتراضية الخاصة بالوضع المختار.
    const d = DEFAULTS[mode];

    // تحديد هل الوضع Discrete.
    const isDiscrete = mode === "discrete";


    // تغيير اسم Frequency حسب نوع الـ Mode.
    document.querySelector('label[for="eo-frequency"]').textContent =
      isDiscrete
        ? "Frequency (f), in cycles per sample"
        : "Frequency (f), in Hz";


    // تغيير التعليمات الموجودة تحت Frequency.
    $("eo-frequency-hint").textContent = isDiscrete
      ? "Cycles per sample, up to 0.5. f = 0.05 means one cycle every 20 samples."
      : "Cycles per second.";


    // تغيير اسم Range حسب نوع الـ Mode.
    $("eo-halfWidth-label").textContent =
      isDiscrete ? "Range N (samples)" : "Range T (s)";


    // تغيير التعليمات الخاصة بالـ Range.
    $("eo-halfWidth-hint").textContent = isDiscrete
      ? "A whole number. n runs from −N to N, so there are 2N + 1 samples."
      : "The plots run from −T to T, always symmetric around 0.";


    // الوصول إلى Slider الخاص بالتردد.
    const slider = $("eo-frequency-slider");

    // تحديث أقل وأكبر قيمة والـ Step للـ Slider.
    slider.min = d.slider.min;
    slider.max = d.slider.max;
    slider.step = d.slider.step;

    // تحديث قيمة Frequency في مربع الإدخال.
    $("eo-frequency").value = d.frequency;

    // تحديث قيمة Frequency في Slider.
    slider.value = d.frequency;

    // تحديث قيمة Range حسب الوضع المختار.
    $("eo-halfWidth").value = d.halfWidth;
  }


  // Function مسؤولة عن عرض رسائل الأخطاء للمستخدم.
  function showFieldErrors(errors) {

    // بنلف على جميع الحقول الموجودة في FIELD_NAMES.
    FIELD_NAMES.forEach(function (name) {

      // الحصول على رسالة الخطأ الخاصة بكل حقل.
      // لو مفيش خطأ بنحط نص فارغ.
      const message = errors[name] || "";

      // عرض رسالة الخطأ داخل HTML.
      $("eo-" + name + "-error").textContent = message;

      // الوصول إلى عنصر الإدخال نفسه.
      const input = $("eo-" + name);

      // إضافة أو إزالة Class اسمه is-invalid حسب وجود الخطأ.
      input.classList.toggle("is-invalid", message !== "");

      // تحديد هل الحقل يحتوي على خطأ أم لا.
      input.setAttribute(
        "aria-invalid",
        message !== "" ? "true" : "false"
      );

    });
  }


  // Function بتنشئ جزء HTML لعرض معلومة إحصائية.
  // بتستقبل اسم المعلومة والقيمة الخاصة بيها.
  function statHtml(label, value) {

    return '<div class="stat">' +
             '<div class="stat-label">' + label + '</div>' +
             '<div class="stat-value">' + value + '</div>' +
           '</div>';
  }


  // Function بتنشئ سطر لعرض نتيجة اختبار رياضي.
  function checkRowHtml(ok, text) {

    // لو الاختبار ناجح بنعرض علامة صح.
    // لو فاشل بنعرض علامة خطأ.
    // وكمان بنغير الـ CSS Class حسب النتيجة.
    return '<li><span class="' +
      (ok ? "status-ok" : "status-fail") +
      '">' +
      (ok ? "✔" : "✘") +
      '</span><span>' + text + '</span></li>';
  }


  // Function بتحول نوع الإشارة إلى جملة مفهومة للمستخدم.
  function classificationText(kind) {

    // لو الإشارة Even.
    if (kind === "even") {
      return "Even (the odd part is 0)";
    }

    // لو الإشارة Odd.
    if (kind === "odd") {
      return "Odd (the even part is 0)";
    }

    // لو الإشارة Neither.
    return "Neither (both parts are non-zero)";
  }


  // Function بتختار نقطة مناسبة من الإشارة لعرض مثال حسابي عليها.
  function pickExampleIndex(result) {

    // بنبدأ من غير ما نكون اخترنا أي نقطة.
    let bestIndex = -1;

    // تخزين أفضل نتيجة وصلنا ليها.
    let bestScore = -1;


    // بنلف على جميع نقاط الزمن.
    for (let i = 0; i < result.t.length; i++) {

      // بنتجاهل النقاط اللي زمنها أقل من أو يساوي صفر.
      // وبنختار من الجزء الموجب لمحور الزمن.
      if (result.t[i] <= 0) {
        continue;
      }

      // حساب أصغر قيمة مطلقة بين الجزء الزوجي والفردي.
      const score = Math.min(
        Math.abs(result.even[i]),
        Math.abs(result.odd[i])
      );

      // لو النقطة الحالية أفضل من السابقة بنحفظها.
      if (score > bestScore + 1e-12) {
        bestScore = score;
        bestIndex = i;
      }
    }


    // لو لقينا نقطة مناسبة يكون فيها الجزآن غير صفريين.
    if (bestScore > 1e-9) {
      return bestIndex;
    }


    // لو ملقيناش نقطة مناسبة بنبدأ نبحث عن نقطة بديلة.
    // بنختار نقطة تكون قيمة الإشارة الأصلية فيها كبيرة.
    bestIndex = result.t.length - 1;

    let bestValue = -1;


    // المرور على جميع النقاط مرة أخرى.
    for (let i = 0; i < result.t.length; i++) {

      // بنختار النقاط الموجبة فقط.
      // وبنبحث عن أكبر قيمة مطلقة للإشارة الأصلية.
      if (
        result.t[i] > 0 &&
        Math.abs(result.x[i]) > bestValue + 1e-12
      ) {

        bestValue = Math.abs(result.x[i]);
        bestIndex = i;
      }
    }

    // إرجاع رقم النقطة المختارة.
    return bestIndex;
  }


  // Function بتنسق الرقم وتضيف قبله علامة الجمع أو الطرح.
  function signedTerm(value) {

    // تحويل الرقم إلى الشكل المناسب للعرض.
    const text = formatNumber(value);

    // لو الرقم سالب بنعرض علامة ناقص.
    // لو موجب بنعرض علامة زائد.
    return text.charAt(0) === "-"
      ? " − " + text.slice(1)
      : " + " + text;
  }


  // Function مسؤولة عن عرض النتائج والحسابات للمستخدم.
  // بتعرض القوانين والنتائج والتصنيف والاختبارات الرياضية.
  function showReadout(values, result) {

    // تحديد هل الوضع Discrete أم Continuous.
    const isDiscrete = result.isDiscrete;

    // تحديد الرمز المستخدم لمحور الزمن.
    // n في Discrete و t في Continuous.
    const arg = isDiscrete ? "n" : "t";

    // تحديد شكل الأقواس المستخدمة في عرض المعادلات.
    const open = isDiscrete ? "[" : "(";
    const close = isDiscrete ? "]" : ")";


    // Function صغيرة لتكوين شكل الدالة.
    // مثال: x(t) أو x[n].
    const fn = function (name, a) {
      return name + open + a + close;
    };


    // الحصول على نتائج التحقق الرياضي.
    const v = result.verification;


    // اختيار نقطة مناسبة لعرض مثال حسابي عليها.
    const i = pickExampleIndex(result);

    // تحديد قيمة الزمن أو رقم العينة عند النقطة المختارة.
    const where = arg + " = " + formatNumber(result.t[i]);


    // إنشاء متغير لتجميع كود HTML الخاص بالنتائج.
    let html = "";


    // عرض قانون إعادة تكوين الإشارة.
    // الإشارة الأصلية = الجزء الزوجي + الجزء الفردي.
    html += '<span class="formula formula-block">Reconstruction:  ' +
      fn("x", arg) + ' = ' +
      fn("xₑ", arg) + ' + ' +
      fn("xₒ", arg) +
      '</span>';


    // عرض مثال حسابي عند النقطة المختارة.
    html += '<span class="formula formula-block">At ' +
      where + ':  ' +
      formatNumber(result.x[i]) + ' = ' +
      formatNumber(result.even[i]) +
      signedTerm(result.odd[i]) +
      '</span>';


    // بداية جزء الإحصائيات.
    html += '<div class="stat-grid">';


    // عرض تصنيف الإشارة.
    html += statHtml(
      "Signal is",
      classificationText(result.classification)
    );


    // عرض عدد العينات المستخدمة.
    html += statHtml(
      "Samples shown",
      result.t.length
    );


    // عرض أكبر خطأ في إعادة تكوين الإشارة.
    html += statHtml(
      "Largest |x − (xₑ + xₒ)|",
      formatError(v.reconstructionError)
    );

    html += '</div>';


    // عرض عنوان اختبارات التحقق الرياضي وقيمة Tolerance.
    html += '<h4>Mathematical verification (tolerance ' +
      formatError(v.tolerance) +
      ')</h4>';


    // بداية قائمة اختبارات التحقق.
    html += '<ul class="status-list">';


    // الاختبار الأول:
    // التأكد إن الإشارة الأصلية تساوي مجموع الجزء الزوجي والفردي.
    html += checkRowHtml(
      v.reconstructionOk,
      'Reconstruction: ' +
      fn("x", arg) + ' = ' +
      fn("xₑ", arg) + ' + ' +
      fn("xₒ", arg) +
      ' at every point. Largest difference ' +
      formatError(v.reconstructionError) + '.'
    );


    // الاختبار الثاني:
    // التأكد إن الجزء الزوجي متماثل حول محور الصفر.
    html += checkRowHtml(
      v.evenOk,
      'Even: ' +
      fn("xₑ", "−" + arg) + ' = ' +
      fn("xₑ", arg) +
      ' at every mirrored pair. Largest difference ' +
      formatError(v.evenSymmetryError) + '.'
    );


    // الاختبار الثالث:
    // التأكد إن الجزء الفردي يحقق خاصية Odd.
    // وكمان قيمته عند الصفر تساوي صفر.
    html += checkRowHtml(
      v.oddOk,
      'Odd: ' +
      fn("xₒ", "−" + arg) + ' = −' +
      fn("xₒ", arg) +
      ' at every mirrored pair, and xₒ at 0 is 0. Largest difference ' +
      formatError(Math.max(
        v.oddSymmetryError,
        v.oddAtZeroError
      )) + '.'
    );


    // نهاية قائمة الاختبارات.
    html += '</ul>';


    // عرض رسالة نهائية حسب نتيجة الاختبارات.
    // لو كلها نجحت بنعرض Verified.
    // لو في اختبار فشل بنعرض Verification FAILED.
    html += '<div class="message ' +
      (v.passed ? 'message-ok' : 'message-error') +
      '">' +

      (v.passed
        ? 'Verified: the original signal equals the sum of its even and odd parts.'
        : 'Verification FAILED: the parts do not add up to the original.') +

      '</div>';


    // عرض جميع النتائج داخل العنصر الموجود في HTML.
    $("evenodd-readout").innerHTML = html;
  }


  // Function بتعرض رسالة تنبيه لو المدخلات غير صحيحة.
  // وبتوضح إن الرسومات القديمة لآخر إشارة صحيحة ما زالت موجودة.
  function showErrorSummary() {

    $("evenodd-readout").innerHTML =
      '<div class="message message-error">Some inputs need fixing (see the red messages in Controls). ' +
      'The plots below still show your last valid signal.</div>';
  }


  // Function مسؤولة عن رسم إشارة واحدة فقط.
  // بتستقبل مكان الرسم والعنوان والبيانات واللون واسم الإشارة.
  function drawOne(divId, title, yLabel, result, y, color, name, yLimit) {

    // تجهيز بيانات الإشارة للرسم.
    const trace = {
      x: result.t,
      y: y,
      name: name,
      color: color
    };

    // تحديد إعدادات الرسم.
    // زي العنوان والمدى الرأسي وارتفاع الرسم.
    const options = {
      title: title,
      yRange: [-yLimit, yLimit],
      height: 300
    };


    // لو الإشارة Discrete.
    if (result.isDiscrete) {

      // تحديد اسم محور X.
      options.xLabel = "n";

      // تحديد اسم محور Y.
      options.yLabel = yLabel;

      // لو عدد العينات أكبر من 21 بنقلل عدد العلامات الظاهرة على المحور.
      options.autoXTicks = result.t.length > 21;

      // رسم الإشارة باستخدام Stem Plot.
      // وهو مناسب للإشارات المتقطعة.
      SignalLab.plot.plotStem(
        divId,
        [trace],
        options
      );

    } else {

      // لو الإشارة Continuous بنستخدم الزمن t.
      options.xLabel = "t (s)";

      // تحديد اسم محور Y.
      options.yLabel = yLabel;

      // رسم الإشارة باستخدام Continuous Plot.
      // وهو مناسب للإشارات المستمرة.
      SignalLab.plot.plotContinuous(
        divId,
        [trace],
        options
      );
    }
  }


  // Function مسؤولة عن رسم الإشارات الثلاثة.
  // الإشارة الأصلية والجزء الزوجي والجزء الفردي.
  function drawPlots(values, result) {

    // تحديد هل الإشارة Discrete.
    const d = result.isDiscrete;

    // تحديد حدود المحور الرأسي.
    // بنستخدم نفس المقياس في الرسومات الثلاثة للمقارنة.
    const limit = values.spec.amplitude * 1.15;


    // رسم الإشارة الأصلية.
    drawOne(
      "evenodd-plot",
      "Original signal " + (d ? "x[n]" : "x(t)") +
      " (" + TYPE_LABELS[values.spec.type].toLowerCase() + ")",
      d ? "x[n]" : "x(t)",
      result,
      result.x,
      COLORS.cyan,
      "x",
      limit
    );


    // رسم الجزء الزوجي.
    drawOne(
      "evenodd-plot-even",
      "Even component " + (d ? "xₑ[n]" : "xₑ(t)"),
      d ? "xₑ[n]" : "xₑ(t)",
      result,
      result.even,
      COLORS.green,
      "xₑ",
      limit
    );


    // رسم الجزء الفردي.
    drawOne(
      "evenodd-plot-odd",
      "Odd component " + (d ? "xₒ[n]" : "xₒ(t)"),
      d ? "xₒ[n]" : "xₒ(t)",
      result,
      result.odd,
      COLORS.magenta,
      "xₒ",
      limit
    );
  }


  // Function أساسية مسؤولة عن تحديث البرنامج بالكامل.
  // بتقرأ المدخلات وتتحقق منها وتحسب النتائج وترسم الإشارات.
  function update() {

    // الوصول إلى Functions الخاصة بالحسابات الرياضية.
    const m = MATH();

    // قراءة المدخلات والتحقق من صحتها.
    const checked = m.validateInputs(readInputs());

    // عرض رسائل الأخطاء الخاصة بالمدخلات.
    showFieldErrors(checked.errors);


    // لو المدخلات غير صحيحة.
    if (!checked.ok) {

      // عرض رسالة الخطأ النهائية.
      showErrorSummary();

      // إيقاف تنفيذ باقي الـ Function.
      return;
    }


    // لو المدخلات صحيحة بنحسب النتائج.
    const result = m.computeResult(checked.values);

    // عرض النتائج والحسابات للمستخدم.
    showReadout(checked.values, result);

    // رسم الإشارات الثلاثة.
    drawPlots(checked.values, result);
  }


  // Function مسؤولة عن تشغيل الأحداث والتفاعل مع المستخدم.
  function setUpEvents() {

    // الوصول إلى الجزء الذي يحتوي على عناصر التحكم.
    const controls = $("evenodd-controls");


    // إضافة Event Listener لمتابعة أي تغيير في المدخلات.
    // حدث input بيشتغل بمجرد تغيير قيمة الحقل أو Slider.
    controls.addEventListener("input", function (event) {

      // معرفة ID الخاص بالعنصر الذي تم تغييره.
      const id = event.target.id;


      // لو المستخدم غير الـ Mode.
      if (event.target.name === "eo-mode") {

        // تغيير إعدادات الصفحة حسب الوضع الجديد.
        applyMode(event.target.value);


      // لو المستخدم حرك Slider.
      } else if (id.endsWith("-slider")) {

        // نقل قيمة Slider إلى مربع الإدخال المقابل.
        $(id.replace("-slider", "")).value = event.target.value;


      } else {

        // الوصول إلى Slider المرتبط بمربع الإدخال.
        const slider = $(id + "-slider");

        // التأكد إن Slider موجود وإن القيمة المدخلة رقم صحيح.
        if (
          slider &&
          event.target.value.trim() !== "" &&
          isFinite(Number(event.target.value))
        ) {

          // تحديث قيمة Slider لتساوي قيمة مربع الإدخال.
          slider.value = event.target.value;
        }
      }

      // تحديث النتائج والرسومات بعد أي تغيير.
      update();
    });


    // إضافة Event Listener لمتابعة الضغط على الأزرار.
    controls.addEventListener("click", function (event) {

      // البحث عن الزر الذي يحتوي على data-phase.
      // يعني أحد أزرار اختيار Phase الجاهزة.
      const button = event.target.closest("[data-phase]");

      // لو الضغط لم يكن على زر Phase نوقف التنفيذ.
      if (!button) {
        return;
      }

      // وضع قيمة Phase الموجودة داخل الزر في مربع الإدخال.
      $("eo-phase").value = button.dataset.phase;

      // تحديث Slider الخاص بالـ Phase بنفس القيمة.
      $("eo-phase-slider").value = button.dataset.phase;

      // تحديث النتائج بعد اختيار Phase جديد.
      update();
    });
  }


  // Function مسؤولة عن بدء تشغيل البرنامج.
  function init() {

    // أولاً: إنشاء عناصر التحكم في الصفحة.
    buildControls();

    // ثانياً: تشغيل الأحداث والتفاعل مع المستخدم.
    setUpEvents();

    // ثالثاً: تنفيذ الحسابات وعرض النتائج الافتراضية.
    update();
  }


  // تسجيل الـ Module داخل SignalLab.
  // عشان باقي أجزاء المشروع تقدر تشغلها باستخدام init.
  SignalLab.modules.evenodd = {
    init: init
  };

})();
