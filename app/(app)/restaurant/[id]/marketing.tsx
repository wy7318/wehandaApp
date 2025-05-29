// Update the handleDecline function in the existing file
const handleDecline = async (campaign: MarketingCampaign) => {
  if (!restaurant) return;

  try {
    // Deduct token and get new suggestion
    const { data, error } = await supabase.rpc(
      'deduct_marketing_tokens',
      {
        p_restaurant_id: id,
        p_amount: 1,
        p_reason: `Declined campaign: ${campaign.name}`,
        p_generate_suggestion: true
      }
    );

    if (error) throw error;

    if (!data.success) {
      Alert.alert('Error', 'Insufficient marketing tokens');
      return;
    }

    // Remove declined campaign and add new suggestion
    const updatedSuggestions = suggestedCampaigns.filter(c => c.name !== campaign.name);
    if (data.new_suggestion) {
      updatedSuggestions.push(data.new_suggestion);
    }
    setSuggestedCampaigns(updatedSuggestions);

    // Update restaurant tokens
    setRestaurant(prev => prev ? {
      ...prev,
      marketing_tokens: prev.marketing_tokens - 1
    } : null);

    // Close modal if open
    setSelectedCampaign(null);
  } catch (err: any) {
    setError(err.message);
  }
};