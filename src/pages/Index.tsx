import { EmailCampaignApp } from "@/components/EmailCampaignApp";
import { AuthWrapper } from "@/components/auth/AuthWrapper";

const Index = () => {
  return (
    <AuthWrapper>
      <EmailCampaignApp />
    </AuthWrapper>
  );
};

export default Index;
