const initializePage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'admin') {
        setIsAuthorized(true);
        const { data: usersData } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
        setUsers(usersData || []);
        await fetchAnalyticsData(selectedUser, date);
      }
    }
    setLoading(false);
  };
  initializePage();