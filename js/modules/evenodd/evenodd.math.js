 // IIFE (Immediately Invoked Function Expression)
// معناها إننا بنعمل Function وبتتنفذ مباشرة بمجرد تحميل الملف.
// الهدف منها حماية المتغيرات والـ Functions من إنها تتداخل مع ملفات تانية.
(function () {

  // Function بترجع الـ Math Generator الموجود داخل SignalLab.
  // بنستخدمها للوصول للدوال الرياضية والـ Limits.
  function generatorMath() {
    return SignalLab.math.generator;
  }

  // أنواع الإشارات اللي البرنامج بيدعمها.
  // Sine: موجة جيبية.
  // Cosine: موجة جيب تمام.
  // Square: موجة مربعة.
  const SIGNAL_TYPES = ["sine", "cosine", "square"];


  // LIMITS: الحدود المسموح بيها للمدخلات والحسابات.
  const LIMITS = {
    // أقصى Frequency في Discrete Mode.
    // وحدتها Cycles per sample.
    discreteFrequencyMax: 0.5,

    // أقصى قيمة لـ N في Discrete Mode.
    // لأننا بنبدأ من -N لحد N.
    // يعني أقصى عدد Samples هو 201.
    halfWidthMaxDiscrete: 100,

    // نسبة الخطأ المسموح بيها عند مقارنة الأرقام.
    // بنستخدمها لتجنب مشاكل Floating Point.
    tolerance: 1e-9
  };


  // Function بتتأكد إن الرقم Integer (عدد صحيح).
  // بنقارن الرقم بأقرب عدد صحيح ليه.
  // لو الفرق أقل من 1e-9 بنعتبره عدد صحيح.
  function isWholeNumber(value) {
    return Math.abs(value - Math.round(value)) < 1e-9;
  }


  // Function بتولد الإشارة وتحسب قيمتها عند أوقات معينة.
  function evaluateSignal(spec, times) {

    // بنستدعي generate من SignalLab عشان نولد الإشارة.
    // بنبعت نوع الإشارة والسعة والتردد والـ Phase.
    const raw = SignalLab.signals.generate(spec.type, times, {
      amplitude: spec.amplitude,
      frequency: spec.frequency,
      phase: spec.phase
    });

    // بنرجع Array جديدة فيها قيم الإشارة.
    // +0 هنا بيحول القيم إلى أرقام عادية ويتجنب -0.
    return raw.map(function (value) {
      return value + 0;
    });
  }


  // Function بتحسب Even Part للإشارة.
  // القانون:
  // Even Part = [x(t) + x(-t)] / 2
  // يعني بنجمع الإشارة الأصلية مع الإشارة المعكوسة ونقسم على 2.
  function evenPart(x, xReversed) {

    return x.map(function (value, i) {
      return (value + xReversed[i]) / 2 + 0;
    });
  }


  // Function بتحسب Odd Part للإشارة.
  // القانون:
  // Odd Part = [x(t) - x(-t)] / 2
  // يعني بنطرح الإشارة المعكوسة من الأصلية ونقسم على 2.
  function oddPart(x, xReversed) {

    return x.map(function (value, i) {
      return (value - xReversed[i]) / 2 + 0;
    });
  }


  // Function مسؤولة عن تقسيم الإشارة إلى Even و Odd.
  function decomposeSignal(spec, times) {

    // حساب الإشارة الأصلية x(t).
    const x = evaluateSignal(spec, times);

    // حساب الإشارة المعكوسة x(-t).
    // بنغير إشارة كل قيمة في محور الزمن.
    const xReversed = evaluateSignal(
      spec,
      times.map(function (t) {
        return -t + 0;
      })
    );

    // بنرجع الإشارة الأصلية والمعكوسة
    // والجزء الزوجي والجزء الفردي.
    return {
      t: times,
      x: x,
      xReversed: xReversed,
      even: evenPart(x, xReversed),
      odd: oddPart(x, xReversed)
    };
  }


  // Function بتجيب أكبر قيمة مطلقة موجودة في Array.
  // بنحتاجها عشان نعرف إذا كان الجزء الزوجي أو الفردي يساوي صفر تقريباً.
  function largestAbsolute(values) {

    // بنبدأ بأكبر قيمة = صفر.
    let largest = 0;

    // بنلف على كل عناصر الـ Array.
    for (let i = 0; i < values.length; i++) {

      // بنقارن أكبر قيمة حالية بالقيمة المطلقة للعنصر.
      largest = Math.max(largest, Math.abs(values[i]));
    }

    // بنرجع أكبر قيمة مطلقة.
    return largest;
  }


  // Function بتتأكد إن عملية تقسيم الإشارة صحيحة رياضياً.
  function verifyDecomposition(parts) {

    const t = parts.t;
    const last = t.length - 1;

    // متغيرات لتخزين أكبر أخطاء ظهرت أثناء الاختبار.
    let reconstruction = 0;
    let evenSymmetry = 0;
    let oddSymmetry = 0;
    let oddAtZero = 0;

    // بنلف على جميع نقاط الإشارة.
    for (let i = 0; i <= last; i++) {

      // نتأكد إن محور الزمن Symmetric حول الصفر.
      // يعني t[i] + t[last-i] لازم يساوي صفر.
      if (Math.abs(t[i] + t[last - i]) > LIMITS.tolerance) {

        throw new Error("The time axis must be symmetric around 0.");
      }

      // اختبار إعادة تكوين الإشارة.
      // لازم x(t) = Even Part + Odd Part.
      reconstruction = Math.max(
        reconstruction,
        Math.abs(parts.x[i] - (parts.even[i] + parts.odd[i]))
      );

      // اختبار خاصية Even Symmetry.
      // لازم Even(t) = Even(-t).
      evenSymmetry = Math.max(
        evenSymmetry,
        Math.abs(parts.even[i] - parts.even[last - i])
      );

      // اختبار خاصية Odd Symmetry.
      // لازم Odd(t) = -Odd(-t).
      oddSymmetry = Math.max(
        oddSymmetry,
        Math.abs(parts.odd[i] + parts.odd[last - i])
      );

      // في حالة الزمن = صفر.
      // لازم قيمة الجزء الفردي تكون صفر.
      if (Math.abs(t[i]) < LIMITS.tolerance) {
        oddAtZero = Math.abs(parts.odd[i]);
      }
    }

    // تحديد قيمة الـ Tolerance المسموح بيها.
    const tol = LIMITS.tolerance;

    // إرجاع نتائج الاختبارات.
    return {

      // مقدار الخطأ في إعادة تكوين الإشارة.
      reconstructionError: reconstruction,

      // مقدار الخطأ في خاصية الجزء الزوجي.
      evenSymmetryError: evenSymmetry,

      // مقدار الخطأ في خاصية الجزء الفردي.
      oddSymmetryError: oddSymmetry,

      // قيمة الجزء الفردي عند t = 0.
      oddAtZeroError: oddAtZero,

      tolerance: tol,

      // هل إعادة تكوين الإشارة صحيحة؟
      reconstructionOk: reconstruction <= tol,

      // هل الجزء الزوجي يحقق خاصية Even؟
      evenOk: evenSymmetry <= tol,

      // هل الجزء الفردي يحقق خاصية Odd؟
      // وكمان لازم يساوي صفر عند t = 0.
      oddOk: oddSymmetry <= tol && oddAtZero <= tol,

      // النتيجة النهائية.
      // لازم كل الاختبارات تنجح.
      passed:
        reconstruction <= tol &&
        evenSymmetry <= tol &&
        oddSymmetry <= tol &&
        oddAtZero <= tol
    };
  }


  // Function بتحدد نوع الإشارة.
  // هل هي Even أو Odd أو Neither؟
  function classifySignal(parts) {

    // بنجيب أكبر قيمة مطلقة للجزء الفردي.
    const oddSize = largestAbsolute(parts.odd);

    // بنجيب أكبر قيمة مطلقة للجزء الزوجي.
    const evenSize = largestAbsolute(parts.even);

    // لو الجزء الفردي كله تقريباً صفر.
    // يبقى الإشارة Even.
    if (oddSize <= LIMITS.tolerance) {
      return "even";
    }

    // لو الجزء الزوجي كله تقريباً صفر.
    // يبقى الإشارة Odd.
    if (evenSize <= LIMITS.tolerance) {
      return "odd";
    }

    // لو الاتنين مش صفر.
    // يبقى الإشارة Neither.
    return "neither";
  }


  // Function بتقرأ الرقم من المستخدم وتتأكد إنه رقم صحيح.
  function readNumber(raw, key, label, example, errors) {

    // بنستخدم parseNumber لتحويل المدخل إلى رقم والتحقق منه.
    const result = generatorMath().parseNumber(raw[key]);

    // لو المدخل مش رقم صحيح.
    if (!result.ok) {

      // بنضيف رسالة خطأ مناسبة.
      errors[key] = label + " needs a number, for example " + example + ".";

      return null;
    }

    // لو الرقم صحيح بنرجع قيمته.
    return result.value;
  }


  // Function مسؤولة عن التحقق من جميع مدخلات المستخدم.
  // زي نوع الإشارة والسعة والتردد والـ Phase والـ Range.
  function validateInputs(raw) {

    // Object لتخزين رسائل الأخطاء.
    const errors = {};

    // الحصول على الحدود المسموح بها من Generator.
    const G = generatorMath().LIMITS;

    // Object لتخزين القيم بعد التحقق منها.
    const values = {
      mode: raw.mode,
      spec: null,
      halfWidth: null
    };

    // التأكد إن المستخدم اختار Continuous أو Discrete.
    if (raw.mode !== "continuous" && raw.mode !== "discrete") {
      errors.mode = "Choose continuous or discrete.";
    }

    // تحديد هل الوضع Discrete أم Continuous.
    const isDiscrete = raw.mode === "discrete";

    // Object لتخزين خصائص الإشارة.
    const spec = {};

    // متغير لمعرفة هل بيانات الإشارة صحيحة.
    let specOk = true;


    // التحقق من نوع الإشارة.
    if (SIGNAL_TYPES.indexOf(raw.type) === -1) {

      errors.type = "Choose sine, cosine or square.";
      specOk = false;

    } else {

      // لو النوع صحيح بنحفظه.
      spec.type = raw.type;
    }


    // قراءة قيمة Amplitude والتحقق منها.
    const amplitude = readNumber(
      raw,
      "amplitude",
      "Amplitude",
      "1.5",
      errors
    );

    if (amplitude === null) {

      specOk = false;

    } else if (amplitude <= 0) {

      // السعة لازم تكون أكبر من صفر.
      errors.amplitude =
        "Amplitude must be greater than 0. To flip a wave, use a phase of π (3.14159).";

      specOk = false;

    } else if (amplitude > G.amplitudeMax) {

      // التأكد إن السعة مش أكبر من الحد المسموح.
      errors.amplitude =
        "Amplitude must be " + G.amplitudeMax + " or less.";

      specOk = false;

    } else {

      // حفظ قيمة Amplitude لو صحيحة.
      spec.amplitude = amplitude;
    }


    // قراءة قيمة Frequency.
    // المثال الافتراضي بيتغير حسب نوع الـ Mode.
    const frequency = readNumber(
      raw,
      "frequency",
      "Frequency",
      isDiscrete ? "0.05" : "2",
      errors
    );

    if (frequency === null) {

      specOk = false;

    } else if (isDiscrete) {

      // في Discrete Mode التردد لازم يكون أكبر من صفر
      // وأقل من أو يساوي 0.5 Cycles per sample.
      if (
        frequency <= 0 ||
        frequency > LIMITS.discreteFrequencyMax
      ) {

        errors.frequency =
          "In discrete mode the frequency is in cycles per sample. Use a value above 0 and at most " +
          LIMITS.discreteFrequencyMax +
          ", for example 0.05 (one cycle every 20 samples).";

        specOk = false;

      } else {

        spec.frequency = frequency;
      }

    } else if (frequency <= 0) {

      // في Continuous Mode التردد لازم يكون أكبر من صفر.
      errors.frequency = "Frequency must be greater than 0 Hz.";

      specOk = false;

    } else if (frequency > G.frequencyMax) {

      // التأكد إن التردد لا يتجاوز الحد الأقصى.
      errors.frequency =
        "Frequency must be " + G.frequencyMax + " Hz or less.";

      specOk = false;

    } else {

      // حفظ التردد لو صحيح.
      spec.frequency = frequency;
    }


    // قراءة قيمة Phase.
    const phase = readNumber(
      raw,
      "phase",
      "Phase",
      "0.785",
      errors
    );

    if (phase === null) {

      specOk = false;

    } else if (Math.abs(phase) > G.phaseMax) {

      // التأكد إن الـ Phase داخل الحدود المسموح بها.
      errors.phase =
        "Phase must be between -" +
        G.phaseMax +
        " and " +
        G.phaseMax +
        " radians. One full turn is 2π ≈ 6.28.";

      specOk = false;

    } else {

      // حفظ قيمة Phase لو صحيحة.
      spec.phase = phase;
    }


    // تحديد اسم الـ Range حسب نوع الـ Mode.
    // في Discrete بنستخدم Range N.
    // في Continuous بنستخدم Range T.
    const label = isDiscrete ? "Range N" : "Range T";

    // قراءة قيمة Half Width.
    const halfWidth = readNumber(
      raw,
      "halfWidth",
      label,
      isDiscrete ? "20" : "2",
      errors
    );

    if (halfWidth !== null) {

      // التأكد إن الـ Range أكبر من صفر.
      if (halfWidth <= 0) {

        errors.halfWidth =
          label +
          " must be greater than 0. The window is symmetric: from -" +
          (isDiscrete ? "N to N." : "T to T.");

      // في Discrete Mode لازم N يكون Integer.
      } else if (isDiscrete && !isWholeNumber(halfWidth)) {

        errors.halfWidth =
          "N must be a whole number (for example 20). Samples exist only at whole numbers n.";

      // التأكد إن N لا يتجاوز 100.
      } else if (
        isDiscrete &&
        halfWidth > LIMITS.halfWidthMaxDiscrete
      ) {

        errors.halfWidth =
          "N must be " +
          LIMITS.halfWidthMaxDiscrete +
          " or less (at most " +
          (2 * LIMITS.halfWidthMaxDiscrete + 1) +
          " samples).";

      // في Continuous Mode بنتأكد إن طول النافذة 2T
      // لا يتجاوز الحد المسموح.
      } else if (!isDiscrete && 2 * halfWidth > G.windowMax) {

        errors.halfWidth =
          "The window (2T) must be " +
          G.windowMax +
          " s or less, so T ≤ " +
          (G.windowMax / 2) +
          ".";

      } else {

        // حفظ قيمة Range بعد التحقق منها.
        // لو Discrete بنحولها إلى Integer.
        values.halfWidth = isDiscrete
          ? Math.round(halfWidth)
          : halfWidth;
      }
    }


    // التحقق من عدد الدورات في Continuous Mode فقط.
    // بنحسب عدد الـ Cycles داخل الفترة من -T إلى T.
    if (
      !isDiscrete &&
      specOk &&
      values.halfWidth !== null
    ) {

      const cycles = generatorMath().countCycles(
        spec.frequency,
        -values.halfWidth,
        values.halfWidth
      );

      // لو عدد الدورات أكبر من الحد المسموح.
      if (cycles > G.cyclesMax) {

        errors.halfWidth =
          "This would show " +
          Math.round(cycles) +
          " cycles, too many to draw clearly (limit " +
          G.cyclesMax +
          "). Shorten the range or lower the frequency.";

        // إلغاء قيمة Range لأنها غير مناسبة.
        values.halfWidth = null;
      }
    }


    // لو بيانات الإشارة كلها صحيحة بنحفظها.
    if (specOk) {
      values.spec = spec;
    }

    // إرجاع نتيجة التحقق.
    // ok: هل المدخلات صحيحة؟
    // errors: رسائل الأخطاء.
    // values: القيم بعد التحقق.
    return {
      ok: Object.keys(errors).length === 0,
      errors: errors,
      values: values
    };
  }


  // Function مسؤولة عن إنشاء محور الزمن Time Axis.
  function makeAxis(values) {

    // الحصول على قيمة Range.
    const T = values.halfWidth;

    // لو الوضع Discrete.
    if (values.mode === "discrete") {

      // إنشاء محور أرقام صحيحة من -N إلى N.
      return SignalLab.signals.makeIndexAxis(-T, T);
    }

    // لو Continuous.
    // إنشاء محور زمن باستخدام التردد والـ Range.
    const base = generatorMath().getContinuousTimeAxis(
      -T,
      T,
      values.spec.frequency
    );

    // حساب عدد الفواصل بين نقاط الزمن.
    let steps = base.length - 1;

    // التأكد إن عدد الفواصل زوجي.
    // عشان محور الزمن يكون Symmetric حول الصفر.
    if (steps % 2 !== 0) {
      steps += 1;
    }

    // إنشاء محور الزمن النهائي.
    // بنبدأ من -T وننتهي عند T.
    // وقيمة الخطوة الزمنية هي 2T / steps.
    return SignalLab.signals.makeTimeAxis(
      -T,
      T,
      (2 * T) / steps
    );
  }


  // Function مسؤولة عن تنفيذ الحسابات بالكامل.
  // دي تعتبر Function الأساسية اللي بتجمع كل النتائج.
  function computeResult(values) {

    // إنشاء محور الزمن.
    const t = makeAxis(values);

    // تقسيم الإشارة إلى Original و Reversed و Even و Odd.
    const parts = decomposeSignal(values.spec, t);

    // إرجاع النتائج النهائية.
    return {

      // تحديد هل الإشارة Discrete أم Continuous.
      isDiscrete: values.mode === "discrete",

      // محور الزمن.
      t: parts.t,

      // الإشارة الأصلية.
      x: parts.x,

      // الإشارة المعكوسة.
      xReversed: parts.xReversed,

      // الجزء الزوجي.
      even: parts.even,

      // الجزء الفردي.
      odd: parts.odd,

      // التحقق من صحة الحسابات الرياضية.
      verification: verifyDecomposition(parts),

      // تحديد تصنيف الإشارة.
      // Even أو Odd أو Neither.
      classification: classifySignal(parts)
    };
  }


  // تصدير جميع الـ Functions داخل SignalLab.math.evenodd.
  // عشان باقي ملفات المشروع تقدر تستخدمها.
  SignalLab.math.evenodd = {

    LIMITS: LIMITS,

    isWholeNumber: isWholeNumber,

    evaluateSignal: evaluateSignal,

    evenPart: evenPart,

    oddPart: oddPart,

    decomposeSignal: decomposeSignal,

    verifyDecomposition: verifyDecomposition,

    classifySignal: classifySignal,

    largestAbsolute: largestAbsolute,

    validateInputs: validateInputs,

    makeAxis: makeAxis,

    computeResult: computeResult
  };

})();
