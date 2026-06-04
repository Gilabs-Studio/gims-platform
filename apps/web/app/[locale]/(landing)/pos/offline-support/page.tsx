import { POS_FEATURES, PosFeatureLandingPage, createPosFeatureMetadata } from "../pos-feature-page";

const feature = POS_FEATURES.offlineSupport;

export const generateMetadata = createPosFeatureMetadata(feature);

export default function OfflineSupportLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  return <PosFeatureLandingPage params={params} feature={feature} />;
}
