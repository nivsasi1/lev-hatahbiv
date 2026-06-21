import type { useHomeSettings } from "../../hooks/useHomeSettings";
import type { useCoupons } from "../../hooks/useCoupons";
import { RibbonEditor } from "./RibbonEditor";
import { FeaturedPicker } from "./FeaturedPicker";
import { SalePicker } from "./SalePicker";
import { ShelfImages } from "./ShelfImages";
import { OffersEditor } from "./OffersEditor";

type HomeApi = ReturnType<typeof useHomeSettings>;
type CouponsApi = ReturnType<typeof useCoupons>;

export function HomeView({ home, coupons }: { home: HomeApi; coupons: CouponsApi }) {
  return (
    <div className="home-content">
      <p className="home-publish-note">השינויים יופיעו באתר אחרי לחיצה על פרסום לאתר</p>
      <RibbonEditor home={home} />
      <FeaturedPicker home={home} />
      <SalePicker home={home} />
      <ShelfImages home={home} />
      <OffersEditor coupons={coupons} />
    </div>
  );
}
