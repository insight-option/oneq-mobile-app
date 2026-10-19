/**
 * Public legal documents (oneq.qa/privacy, oneq.qa/terms, and the same screens inside the app).
 * Edit the contact block and LAST_UPDATED here; the pages render whatever this file holds.
 * These texts describe how the app actually works (Cognito phone/e-mail sign-in with SMS codes, AWS hosting in the
 * Mumbai region, WhatsApp gifts, Expo push notifications) — keep them in sync when that changes, and have them
 * reviewed by a lawyer in Qatar before relying on them.
 */
export const LEGAL_CONTACT = {
  email: 'support@oneq.qa',
  website: 'https://oneq.qa',
  city: { ar: 'الدوحة، دولة قطر', en: 'Doha, State of Qatar' },
} as const;

export const LAST_UPDATED = { ar: '17 أكتوبر 2026', en: '17 October 2026' } as const;

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalKind = 'privacy' | 'terms';
type Lang = 'ar' | 'en';

const email = LEGAL_CONTACT.email;

export const LEGAL: Record<LegalKind, Record<Lang, LegalDocument>> = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      intro: `This Privacy Policy explains how OneQ ("OneQ", "we", "us") collects, uses, shares and protects personal data when you use the OneQ mobile application and the website ${LEGAL_CONTACT.website} (together, the "Service"). OneQ is a booking platform in Qatar that connects customers with clinics, gyms, salons, home-service and construction companies.`,
      sections: [
        {
          heading: '1. Information we collect',
          bullets: [
            'Account information: your name, mobile number, and — if you choose to add them — your e-mail address and a password.',
            'Profile information: profile photo, preferred language, favourite companies and saved addresses (including their map location) for home services.',
            'Booking information: the companies, services, products, staff, dates and times you book, notes you add, the payment method you choose, prices, points used and booking status.',
            'Gift information: when you send a gift, the recipient’s name and mobile number, your message and the gift details.',
            'Location: with your permission, your device location is used on your device to show the nearest companies; you can also pick an area manually. Saved addresses are stored with your account.',
            'Device information: a push-notification token, the device platform and basic technical logs needed to operate and secure the Service.',
            'Company accounts: business details, logo and photos, service and product catalogue, opening hours, staff names and photos, and the owner’s name, mobile number and e-mail address.',
          ],
        },
        {
          heading: '2. How we use your information',
          bullets: [
            'To create and secure your account and sign you in, including by sending one-time verification codes by SMS.',
            'To make, confirm, change and cancel bookings and subscriptions, and to show your booking history.',
            'To send and deliver gifts and to manage loyalty points.',
            'To send service notifications (booking confirmations, reminders, gift and account updates) by push notification, SMS or e-mail.',
            'To provide customer support and respond to your requests.',
            'To keep the Service safe, prevent fraud and abuse, and comply with legal obligations.',
            'To understand how the Service is used and improve it, using aggregated information where possible.',
          ],
        },
        {
          heading: '3. SMS messages and consent',
          paragraphs: [
            'When you enter your mobile number in the app and request a code, you agree to receive SMS messages from OneQ containing one-time verification codes. We may also send transactional SMS messages about your account or bookings. We do not send marketing SMS messages without your separate consent.',
            'Message frequency depends on how you use the Service. Standard carrier message and data rates may apply. You can stop non-essential messages at any time by contacting us; verification codes are required to sign in with your mobile number.',
            'We do not sell, rent or share your mobile number or SMS consent with third parties for their marketing purposes.',
          ],
        },
        {
          heading: '4. How we share information',
          paragraphs: ['We do not sell your personal data. We share it only as described below:'],
          bullets: [
            'With the company you book with or buy from: your name, mobile number, the booking details and, for home services, the service address — so that the company can deliver the service.',
            'With the recipient of a gift: your name, your message and the gift details. If the recipient is not registered, the gift is sent through WhatsApp from your device.',
            'With service providers that process data on our behalf under contract: Amazon Web Services (hosting, databases, file storage, sign-in and SMS delivery) and Expo (delivery of push notifications).',
            'With map providers (OpenStreetMap or Google Maps) only when you open a map or directions.',
            'With authorities when required by law, or to protect the rights, safety and property of our users, companies or OneQ.',
          ],
        },
        {
          heading: '5. Where your data is stored',
          paragraphs: [
            'Your data is stored on Amazon Web Services servers in the Asia Pacific (Mumbai) region, outside the State of Qatar. We protect it with encryption in transit, access controls and the security safeguards described below.',
          ],
        },
        {
          heading: '6. How long we keep data',
          paragraphs: [
            'We keep your account data while your account is active. When you delete your account, we delete or anonymise your personal data within 30 days, except where we must keep certain records (for example booking and payment records) to meet legal, tax or accounting obligations, or to resolve disputes.',
          ],
        },
        {
          heading: '7. Your rights',
          paragraphs: [
            `In line with Qatar Law No. 13 of 2016 on the Protection of Personal Data Privacy, you can ask to access, correct or delete your personal data, withdraw your consent, or object to certain processing. You can update most of your information in the app. To make a request, or to delete your account and data, contact us at ${email}. We will respond within 30 days.`,
          ],
        },
        {
          heading: '8. Security',
          paragraphs: [
            'We use industry-standard safeguards, including encrypted connections (TLS), secure sign-in through Amazon Cognito, restricted access to data, and monitoring. No method of transmission or storage is completely secure, but we work to protect your data and will notify you and the authorities of a breach where the law requires.',
          ],
        },
        {
          heading: '9. Children',
          paragraphs: [
            'The Service is intended for people aged 18 and over. Bookings for children (for example, paediatric appointments) must be made by a parent or legal guardian, who is responsible for the information provided.',
          ],
        },
        {
          heading: '10. Changes to this policy',
          paragraphs: ['We may update this policy. We will post the new version on this page with a new date and, for significant changes, notify you in the app.'],
        },
        {
          heading: '11. Contact us',
          paragraphs: [`OneQ — ${LEGAL_CONTACT.city.en}. E-mail: ${email}. Website: ${LEGAL_CONTACT.website}.`],
        },
      ],
    },
    ar: {
      title: 'سياسة الخصوصية',
      intro: `توضح سياسة الخصوصية هذه كيف تجمع OneQ («OneQ» أو «نحن») البيانات الشخصية وتستخدمها وتشاركها وتحميها عند استخدامك تطبيق OneQ وموقع ${LEGAL_CONTACT.website} (ويُشار إليهما معًا بـ «الخدمة»). OneQ منصة حجوزات في قطر تربط العملاء بالعيادات والنوادي الرياضية والصالونات وشركات الخدمات المنزلية والبناء.`,
      sections: [
        {
          heading: '1. البيانات التي نجمعها',
          bullets: [
            'بيانات الحساب: اسمك ورقم جوالك، وبريدك الإلكتروني وكلمة المرور إذا اخترت إضافتهما.',
            'بيانات الملف الشخصي: الصورة الشخصية واللغة المفضلة والشركات المفضلة والعناوين المحفوظة (مع موقعها على الخريطة) للخدمات المنزلية.',
            'بيانات الحجز: الشركات والخدمات والمنتجات والموظفون والمواعيد التي تحجزها، والملاحظات، وطريقة الدفع المختارة، والأسعار، والنقاط المستخدمة، وحالة الحجز.',
            'بيانات الهدايا: عند إرسال هدية، اسم المستلم ورقم جواله ورسالتك وتفاصيل الهدية.',
            'الموقع: بعد إذنك يُستخدم موقع جهازك على جهازك لعرض أقرب الشركات، ويمكنك اختيار المنطقة يدويًا. تُحفظ العناوين التي تضيفها مع حسابك.',
            'بيانات الجهاز: رمز الإشعارات ونوع الجهاز وسجلات تقنية أساسية لازمة لتشغيل الخدمة وحمايتها.',
            'حسابات الشركات: بيانات النشاط والشعار والصور وقائمة الخدمات والمنتجات وساعات العمل وأسماء الموظفين وصورهم، واسم صاحب الحساب ورقم جواله وبريده الإلكتروني.',
          ],
        },
        {
          heading: '2. كيف نستخدم بياناتك',
          bullets: [
            'لإنشاء حسابك وحمايته وتسجيل دخولك، بما في ذلك إرسال رموز التحقق لمرة واحدة عبر الرسائل النصية.',
            'لإجراء الحجوزات والاشتراكات وتأكيدها وتعديلها وإلغائها وعرض سجلها.',
            'لإرسال الهدايا وتسليمها وإدارة نقاط الولاء.',
            'لإرسال إشعارات الخدمة (تأكيد الحجز والتذكيرات وتحديثات الهدايا والحساب) عبر الإشعارات أو الرسائل النصية أو البريد الإلكتروني.',
            'لتقديم الدعم والرد على طلباتك.',
            'لحماية الخدمة ومنع الاحتيال وإساءة الاستخدام والالتزام بالقوانين.',
            'لفهم استخدام الخدمة وتحسينها، باستخدام بيانات مجمّعة كلما أمكن.',
          ],
        },
        {
          heading: '3. الرسائل النصية والموافقة',
          paragraphs: [
            'عند إدخال رقم جوالك في التطبيق وطلب الرمز، فإنك توافق على استلام رسائل نصية من OneQ تحتوي على رموز تحقق لمرة واحدة. وقد نرسل رسائل خدمية تخص حسابك أو حجوزاتك. لا نرسل رسائل تسويقية دون موافقة منفصلة منك.',
            'يعتمد عدد الرسائل على استخدامك للخدمة، وقد تُطبّق رسوم شركة الاتصالات المعتادة. يمكنك إيقاف الرسائل غير الأساسية في أي وقت بالتواصل معنا، علمًا بأن رموز التحقق لازمة لتسجيل الدخول برقم الجوال.',
            'لا نبيع رقم جوالك أو موافقتك على الرسائل ولا نؤجرهما ولا نشاركهما مع أي طرف ثالث لأغراضه التسويقية.',
          ],
        },
        {
          heading: '4. مشاركة البيانات',
          paragraphs: ['لا نبيع بياناتك الشخصية، ونشاركها فقط على النحو التالي:'],
          bullets: [
            'مع الشركة التي تحجز لديها أو تشتري منها: اسمك ورقم جوالك وتفاصيل الحجز، وعنوان الخدمة للخدمات المنزلية، لتتمكن الشركة من تقديم الخدمة.',
            'مع مستلم الهدية: اسمك ورسالتك وتفاصيل الهدية. وإذا لم يكن المستلم مسجلًا، تُرسل الهدية عبر واتساب من جهازك.',
            'مع مزودي خدمات يعالجون البيانات نيابة عنا بموجب عقود: Amazon Web Services (الاستضافة وقواعد البيانات وتخزين الملفات وتسجيل الدخول وإرسال الرسائل النصية) وExpo (توصيل الإشعارات).',
            'مع مزودي الخرائط (OpenStreetMap أو Google Maps) فقط عند فتحك للخريطة أو الاتجاهات.',
            'مع الجهات الرسمية عندما يفرض القانون ذلك، أو لحماية حقوق وسلامة وممتلكات المستخدمين أو الشركات أو OneQ.',
          ],
        },
        {
          heading: '5. مكان حفظ البيانات',
          paragraphs: [
            'تُحفظ بياناتك على خوادم Amazon Web Services في منطقة آسيا والمحيط الهادئ (مومباي) خارج دولة قطر، ونحميها بالتشفير أثناء النقل وضوابط الوصول وإجراءات الأمان الموضحة أدناه.',
          ],
        },
        {
          heading: '6. مدة الاحتفاظ بالبيانات',
          paragraphs: [
            'نحتفظ ببيانات حسابك طوال فترة نشاطه. وعند حذف حسابك نحذف بياناتك الشخصية أو نجعلها مجهولة الهوية خلال 30 يومًا، باستثناء السجلات التي يلزمنا القانون بالاحتفاظ بها (مثل سجلات الحجوزات والمدفوعات) لأغراض قانونية أو ضريبية أو محاسبية أو لحل النزاعات.',
          ],
        },
        {
          heading: '7. حقوقك',
          paragraphs: [
            `وفقًا للقانون رقم (13) لسنة 2016 بشأن حماية خصوصية البيانات الشخصية في دولة قطر، يحق لك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها، وسحب موافقتك، والاعتراض على بعض أنواع المعالجة. يمكنك تحديث معظم بياناتك من التطبيق، ولتقديم طلب أو لحذف حسابك وبياناتك راسلنا على ${email}، وسنرد خلال 30 يومًا.`,
          ],
        },
        {
          heading: '8. أمن البيانات',
          paragraphs: [
            'نستخدم إجراءات حماية معتمدة، منها الاتصالات المشفرة (TLS) وتسجيل الدخول الآمن عبر Amazon Cognito وتقييد الوصول إلى البيانات والمراقبة المستمرة. لا توجد وسيلة نقل أو تخزين آمنة تمامًا، لكننا نعمل على حماية بياناتك، وسنبلغك ونبلغ الجهات المختصة عند حدوث اختراق متى أوجب القانون ذلك.',
          ],
        },
        {
          heading: '9. الأطفال',
          paragraphs: [
            'الخدمة موجهة لمن بلغوا 18 عامًا فأكثر. يجب أن يُجري حجوزات الأطفال (مثل مواعيد طب الأطفال) أحدُ الوالدين أو الولي الشرعي، وهو المسؤول عن البيانات المقدمة.',
          ],
        },
        {
          heading: '10. التعديلات على هذه السياسة',
          paragraphs: ['قد نحدّث هذه السياسة، وسننشر النسخة الجديدة في هذه الصفحة مع تاريخ التحديث، ونبلغك داخل التطبيق عند التغييرات الجوهرية.'],
        },
        {
          heading: '11. تواصل معنا',
          paragraphs: [`OneQ — ${LEGAL_CONTACT.city.ar}. البريد الإلكتروني: ${email}. الموقع: ${LEGAL_CONTACT.website}.`],
        },
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of Service',
      intro: `These Terms of Service ("Terms") govern your use of the OneQ mobile application and the website ${LEGAL_CONTACT.website} (the "Service"). By creating an account or using the Service you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Service.`,
      sections: [
        {
          heading: '1. The Service',
          paragraphs: [
            'OneQ is a platform that lets customers discover and book services and products offered by independent companies in Qatar, such as clinics, gyms, salons, home-service and construction companies. The companies provide the services; OneQ provides the platform and is not a party to the service itself, except where these Terms say otherwise.',
          ],
        },
        {
          heading: '2. Your account',
          bullets: [
            'You must be at least 18 years old and provide accurate, complete information.',
            'You sign in with your mobile number and a one-time SMS code, or with your e-mail and password. Keep your device, codes and password secure; you are responsible for activity on your account.',
            'Company accounts are created by OneQ. The company owner is responsible for the account, the staff details and everything published under the company.',
            'Tell us immediately at ' + email + ' if you suspect unauthorised use of your account.',
          ],
        },
        {
          heading: '3. Bookings, prices and payments',
          bullets: [
            'Prices, availability, offers and service descriptions are set by each company. The price shown when you confirm a booking is the price that applies.',
            'A booking is confirmed when the app shows it as confirmed. Arrive on time; companies may apply their own lateness and no-show rules.',
            'You can cancel or reschedule from the app within the time allowed for that booking. Refunds for paid bookings follow the company’s cancellation policy and the payment method used.',
            'When online payment is available it is processed by our payment provider; OneQ does not store full card numbers.',
          ],
        },
        {
          heading: '4. Subscriptions, points and gifts',
          bullets: [
            'Subscriptions and packages are valid for the period and number of sessions shown at purchase and cannot be transferred unless the app allows it.',
            'Loyalty points are earned and redeemed as shown in the app (currently 100 points = QAR 10 in discounts). Points have no cash value, cannot be sold or exchanged for money, and may expire or be cancelled if obtained through misuse.',
            'Gifts are sent to a mobile number you provide. You are responsible for entering the correct number and for having the recipient’s permission to share it. A gift is redeemed by its recipient and cannot be exchanged for cash.',
          ],
        },
        {
          heading: '5. Company obligations',
          bullets: [
            'Hold all licences and permits required in Qatar for the services offered, and provide them as described.',
            'Keep the catalogue, prices, hours and staff information accurate, and honour confirmed bookings.',
            'Use customer data only to deliver the booked service and protect it in line with the law.',
          ],
        },
        {
          heading: '6. Acceptable use',
          paragraphs: ['You agree not to:'],
          bullets: [
            'Use the Service for unlawful, fraudulent or harmful purposes, or make bookings you do not intend to keep.',
            'Post false, offensive or misleading reviews or content, or content you do not have the rights to.',
            'Interfere with or attempt to gain unauthorised access to the Service, other accounts or our systems.',
            'Copy, resell or exploit the Service or its content without our written permission.',
          ],
        },
        {
          heading: '7. Reviews and content',
          paragraphs: [
            'You keep ownership of content you submit (such as reviews and photos) and give OneQ a non-exclusive, royalty-free licence to display it in the Service. We may remove content that breaks these Terms.',
          ],
        },
        {
          heading: '8. Intellectual property',
          paragraphs: ['The OneQ name, logo, design and software belong to OneQ or its licensors and are protected by law. These Terms do not give you any right to use them except to use the Service.'],
        },
        {
          heading: '9. Disclaimers and liability',
          paragraphs: [
            'The Service is provided "as is" and "as available". Companies are solely responsible for the services and products they provide, including their quality, safety and professional standards. To the extent permitted by law, OneQ is not liable for indirect or consequential losses, and our total liability for any claim relating to the Service is limited to the amount you paid through the Service for the booking concerned. Nothing in these Terms limits liability that cannot be limited under the laws of Qatar.',
          ],
        },
        {
          heading: '10. Suspension and termination',
          paragraphs: [
            `You can stop using the Service and ask us to delete your account at any time by contacting ${email}. We may suspend or close accounts that break these Terms or the law.`,
          ],
        },
        {
          heading: '11. Changes',
          paragraphs: ['We may update these Terms. We will post the new version here with a new date and notify you of significant changes in the app. Continuing to use the Service after a change means you accept the updated Terms.'],
        },
        {
          heading: '12. Governing law',
          paragraphs: ['These Terms are governed by the laws of the State of Qatar. Disputes are subject to the jurisdiction of the competent courts of Qatar.'],
        },
        {
          heading: '13. Contact',
          paragraphs: [`OneQ — ${LEGAL_CONTACT.city.en}. E-mail: ${email}. Website: ${LEGAL_CONTACT.website}.`],
        },
      ],
    },
    ar: {
      title: 'شروط الاستخدام',
      intro: `تنظم شروط الاستخدام هذه («الشروط») استخدامك لتطبيق OneQ وموقع ${LEGAL_CONTACT.website} («الخدمة»). بإنشاء حساب أو استخدام الخدمة فإنك توافق على هذه الشروط وعلى سياسة الخصوصية. إذا لم توافق، فلا تستخدم الخدمة.`,
      sections: [
        {
          heading: '1. الخدمة',
          paragraphs: [
            'OneQ منصة تتيح للعملاء اكتشاف وحجز الخدمات والمنتجات التي تقدمها شركات مستقلة في قطر، مثل العيادات والنوادي الرياضية والصالونات وشركات الخدمات المنزلية والبناء. تقدم الشركات الخدمات بنفسها، وتوفر OneQ المنصة فقط ولا تكون طرفًا في الخدمة ذاتها إلا فيما تنص عليه هذه الشروط.',
          ],
        },
        {
          heading: '2. حسابك',
          bullets: [
            'يجب ألا يقل عمرك عن 18 عامًا وأن تقدم بيانات صحيحة وكاملة.',
            'تسجّل الدخول برقم جوالك ورمز تحقق يصلك برسالة نصية، أو ببريدك الإلكتروني وكلمة المرور. حافظ على جهازك ورموزك وكلمة مرورك، فأنت مسؤول عن النشاط الذي يتم عبر حسابك.',
            'تنشئ OneQ حسابات الشركات، ويكون صاحب الشركة مسؤولًا عن الحساب وبيانات الموظفين وكل ما يُنشر باسم الشركة.',
            'أبلغنا فورًا على ' + email + ' إذا اشتبهت في استخدام حسابك دون إذن.',
          ],
        },
        {
          heading: '3. الحجوزات والأسعار والدفع',
          bullets: [
            'تحدد كل شركة أسعارها ومواعيدها وعروضها ووصف خدماتها، والسعر المعروض عند تأكيد الحجز هو السعر المعتمد.',
            'يُعد الحجز مؤكدًا عندما يظهر مؤكدًا في التطبيق. احرص على الحضور في الموعد، فقد تطبق الشركات قواعدها الخاصة بالتأخير وعدم الحضور.',
            'يمكنك إلغاء الحجز أو تغيير موعده من التطبيق خلال المدة المسموح بها. يخضع استرداد المبالغ المدفوعة لسياسة الإلغاء لدى الشركة ولطريقة الدفع المستخدمة.',
            'عند توفر الدفع الإلكتروني تتم معالجته عبر مزود خدمة الدفع، ولا تحتفظ OneQ بأرقام البطاقات كاملة.',
          ],
        },
        {
          heading: '4. الاشتراكات والنقاط والهدايا',
          bullets: [
            'الاشتراكات والباقات صالحة للمدة وعدد الجلسات الموضحة عند الشراء، ولا يجوز نقلها إلا إذا أتاح التطبيق ذلك.',
            'تُكتسب نقاط الولاء وتُستبدل كما يوضح التطبيق (حاليًا كل 100 نقطة = 10 ريال خصمًا). ليس للنقاط قيمة نقدية، ولا يجوز بيعها أو استبدالها بالمال، وقد تنتهي صلاحيتها أو تُلغى إذا حُصل عليها بإساءة الاستخدام.',
            'تُرسل الهدايا إلى رقم الجوال الذي تدخله، وأنت مسؤول عن صحة الرقم وعن حصولك على إذن المستلم لمشاركته. يستخدم الهديةَ مستلمُها، ولا يجوز استبدالها بالمال.',
          ],
        },
        {
          heading: '5. التزامات الشركات',
          bullets: [
            'الحصول على جميع التراخيص والتصاريح اللازمة في قطر للخدمات المعروضة، وتقديمها كما هي موصوفة.',
            'المحافظة على دقة قائمة الخدمات والأسعار وساعات العمل وبيانات الموظفين، والالتزام بالحجوزات المؤكدة.',
            'استخدام بيانات العملاء لتقديم الخدمة المحجوزة فقط وحمايتها وفقًا للقانون.',
          ],
        },
        {
          heading: '6. الاستخدام المقبول',
          paragraphs: ['توافق على ألا تقوم بما يلي:'],
          bullets: [
            'استخدام الخدمة لأغراض غير مشروعة أو احتيالية أو ضارة، أو إجراء حجوزات لا تنوي حضورها.',
            'نشر تقييمات أو محتوى كاذب أو مسيء أو مضلل، أو محتوى لا تملك حقوقه.',
            'التدخل في الخدمة أو محاولة الوصول غير المصرح به إليها أو إلى حسابات الآخرين أو أنظمتنا.',
            'نسخ الخدمة أو محتواها أو إعادة بيعه أو استغلاله دون إذن كتابي منا.',
          ],
        },
        {
          heading: '7. التقييمات والمحتوى',
          paragraphs: [
            'تبقى ملكية المحتوى الذي تنشره (مثل التقييمات والصور) لك، وتمنح OneQ ترخيصًا غير حصري ومجانيًا لعرضه في الخدمة. ويحق لنا حذف المحتوى المخالف لهذه الشروط.',
          ],
        },
        {
          heading: '8. الملكية الفكرية',
          paragraphs: ['اسم OneQ وشعارها وتصميمها وبرمجياتها مملوكة لـ OneQ أو للجهات المرخِّصة لها ومحمية قانونًا، ولا تمنحك هذه الشروط أي حق في استخدامها إلا لاستخدام الخدمة.'],
        },
        {
          heading: '9. إخلاء المسؤولية وحدودها',
          paragraphs: [
            'تُقدَّم الخدمة «كما هي» و«حسب توفرها». الشركات وحدها مسؤولة عن الخدمات والمنتجات التي تقدمها، بما في ذلك جودتها وسلامتها ومعاييرها المهنية. وفي الحدود التي يسمح بها القانون، لا تتحمل OneQ مسؤولية الأضرار غير المباشرة أو التبعية، وتقتصر مسؤوليتها الإجمالية عن أي مطالبة تتعلق بالخدمة على المبلغ الذي دفعته عبر الخدمة للحجز المعني. ولا يحد أي نص في هذه الشروط من مسؤولية لا يجوز تحديدها بموجب قوانين دولة قطر.',
          ],
        },
        {
          heading: '10. الإيقاف وإنهاء الحساب',
          paragraphs: [`يمكنك التوقف عن استخدام الخدمة وطلب حذف حسابك في أي وقت بمراسلتنا على ${email}. ويحق لنا إيقاف أو إغلاق الحسابات التي تخالف هذه الشروط أو القانون.`],
        },
        {
          heading: '11. التعديلات',
          paragraphs: ['قد نحدّث هذه الشروط، وسننشر النسخة الجديدة هنا مع تاريخ التحديث ونبلغك بالتغييرات الجوهرية داخل التطبيق. استمرارك في استخدام الخدمة بعد التعديل يعني موافقتك على الشروط المحدّثة.'],
        },
        {
          heading: '12. القانون الواجب التطبيق',
          paragraphs: ['تخضع هذه الشروط لقوانين دولة قطر، وتختص المحاكم القطرية المختصة بالنظر في أي نزاع.'],
        },
        {
          heading: '13. التواصل',
          paragraphs: [`OneQ — ${LEGAL_CONTACT.city.ar}. البريد الإلكتروني: ${email}. الموقع: ${LEGAL_CONTACT.website}.`],
        },
      ],
    },
  },
};
