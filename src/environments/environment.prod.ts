export const environment = {
  production: true,
  soapEndpoints: {
    login:     '/sap/bc/srt/scs/sap/zws_cp_log_902095?sap-client=100',
    profile:   '/sap/bc/srt/scs/sap/zws_cp_profile_902095?sap-client=100',
    dashboard: '/sap/bc/srt/scs/sap/zws_cp_sd_902095?sap-client=100',
    financial: '/sap/bc/srt/scs/sap/zws_cp_fi_902095?sap-client=100',
    invoice:   '/sap/bc/srt/scs/sap/zws_cp_inv_pdf_902095?sap-client=100',
    inquiry:   '/sap/bc/srt/scs/sap/zws_cp_inq_902095?sap-client=100',
    lod:       '/sap/bc/srt/scs/sap/zws_cp_lod_902095?sap-client=100',
    payment:   '/sap/bc/srt/scs/sap/zws_cp_pay_902095?sap-client=100',
    fi_ov:     '/sap/bc/srt/scs/sap/zws_cp_fi_ov_902095?sap-client=100',
  },
  sapAuth: {
    username: 'CPUSER',
    password: 'Welcome@1'
  }
};
