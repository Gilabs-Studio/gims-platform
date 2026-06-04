import { POS_FEATURES, PosFeatureLandingPage, createPosFeatureMetadata } from "../pos-feature-page";

const feature = POS_FEATURES.floorLayout;

export const generateMetadata = createPosFeatureMetadata(feature);

export default function FloorLayoutLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  return <PosFeatureLandingPage params={params} feature={feature} />;
}
