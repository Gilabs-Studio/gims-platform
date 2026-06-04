import { POS_FEATURES, PosFeatureLandingPage, createPosFeatureMetadata } from "../pos-feature-page";

const feature = POS_FEATURES.qrReview;

export const generateMetadata = createPosFeatureMetadata(feature);

export default function QrReviewLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  return <PosFeatureLandingPage params={params} feature={feature} />;
}
