import { useAppStore } from '../context/store';

const dict = {
  en: {
    heroTitle: "Compliance, verified.",
    heroSubtitle: "LabelCheck instantly audits packaged commodities against India's Legal Metrology Rules for safety and transparency.",
    scanShopper: "Scan as a shopper",
    signInManufacturer: "Sign in as Manufacturer",
    signInInspector: "Sign in as Inspector",
    scanProduct: "Scan Product",
    scanProductSubtitle: "Capture the front and back panels to begin verification.",
    history: "History",
    rulebook: "Rulebook",
    dashboard: "Dashboard",
    queue: "Action Queue",
    notices: "Notices",
    products: "Products"
  },
  hi: {
    heroTitle: "अनुपालन, सत्यापित।",
    heroSubtitle: "LabelCheck सुरक्षा और पारदर्शिता के लिए भारत के विधिक माप विज्ञान नियमों के विरुद्ध पैक की गई वस्तुओं का तुरंत ऑडिट करता है।",
    scanShopper: "खरीदार के रूप में स्कैन करें",
    signInManufacturer: "निर्माता के रूप में साइन इन करें",
    signInInspector: "निरीक्षक के रूप में साइन इन करें",
    scanProduct: "उत्पाद स्कैन करें",
    scanProductSubtitle: "सत्यापन शुरू करने के लिए आगे और पीछे के पैनल कैप्चर करें।",
    history: "इतिहास",
    rulebook: "नियम पुस्तिका",
    dashboard: "डैशबोर्ड",
    queue: "कार्रवाई कतार",
    notices: "नोटिस",
    products: "उत्पाद"
  }
};

export function useTranslation() {
  const locale = useAppStore(state => state.locale);
  
  return {
    t: (key: keyof typeof dict.en) => dict[locale][key] || key,
    locale
  };
}
