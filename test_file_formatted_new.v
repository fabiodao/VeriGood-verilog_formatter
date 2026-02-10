DWC_dptx_hdcp_top U_DWC_dptx_hdcp_top(
  .link_rst_n                                     (link_rst_n                                    ),
  `ifdef DWC_DPTX_SAFETY
  .link_rst_n_1d                                  (link_rst_n_1d                                 ),
  `endif // DWC_DPTX_SAFETY
  .hdcp_link_rst_n                                (hdcp_link_rst_n                               ),
  .link_clk                                       (link_clk_int                                  ),
  .link_clk_gt_hdcp13                             (link_clk_gt_hdcp13                            ),
  .phy_rst_n                                      (phy_int_rst_n                                 ),
  .phy_clk                                        (cipher_clk_o                                  ),
  .phy_clk_gt_hdcp13                              (cipher_clk_gt_hdcp13                          ),
  `ifndef DWC_DPTX_COMBO_PHY
  .phy_clk_sel_i                                  (wphy_clk_sel_qst_sx2l                         ),
  `endif // DWC_DPTX_COMBO_PHY
  .apb_rst_n                                      (apb_rst_n                                     ),
  .apb_clk                                        (apb_clk_i                                     ),
  .ohdcp13enable                                  (whdcp13enable                                 ),
  .encryption_mode_qst_x2l                        (encryption_mode_i                             ),
  .cipher_clk_sel                                 (cipher_clk_sel                                ),
  .debug_hdcp                                     (debug_hdcp                                    ),
  .ihdcprstz                                      (hdcp_aux_rst1_n                               ),
  // MST interface
  `ifdef DWC_DPTX_MST
  .mst_en                                         (enable_mst_qst_sa2l                           ),
  `else // DWC_DPTX_MST
  .mst_en                                         (1'b0                                          ),
  `endif // DWC_DPTX_MST
  .stream_type_pattern                            (stream_type_pattern                           ),
  `ifdef DWC_DPTX_128B132B
  .icfg_enable_mode128b132b                       (wcfg_enable_mode128b132b_sa2l                 ),
  `endif // DWC_DPTX_128B132B
  //AUX interface
  .auxclk                                         (aux16mhz_clk                                  ),
  .auxrstz                                        (hdcp_aux_rst2_n                               ),
  `ifdef DWC_DPTX_SAFETY
  .auxrstz_1d                                     (hdcp_aux_rst2_n_1d                            ),
  `endif // DWC_DPTX_SAFETY
  .hdcp_aux_req                                   (hdcp_aux_req                                  ),
  .hdcp_aux_wdata                                 (hdcp_aux_wdata                                ),
  .hdcp_aux_wdata_pop                             (hdcp_aux_wdata_pop                            ),
  .hdcp_aux_rdata                                 (hdcp_aux_rdata                                ),
  .hdcp_aux_rdata_vld                             (hdcp_aux_rdata_vld                            ),
  .hdcp_aux_ack                                   (hdcp_aux_ack                                  ),
  .hdcp_aux_nack_timeout                          (hdcp_aux_nack_timeout                         ),
  .hdcp_aux_defer_timeout                         (hdcp_aux_defer_timeout                        ),
  .aux_timeout                                    (hdcp_aux_timeout                              ),
  // CSR Interface signal
  .csr_req_p                                      (csr_req_p_sa2u                                ),
  .csr_addr                                       (csr_addr_sa2u                                 ),
  .csr_wr_data                                    (csr_wr_data_sa2u                              ),
  `ifdef DWC_DPTX_SAFETY
  .csr_wr_parity                                  (csr_wr_parity_sa2u                            ),
  `endif // DWC_DPTX_SAFETY
  .csr_write                                      (csr_write_sa2u                                ),
  .csr_hdcp_rdy_p_su2a                            (csr_hdcp_rdy_p_su2a                           ),
  .csr_hdcp_rdata_su2a                            (csr_hdcp_rdata_su2a                           ),
  `ifdef DWC_DPTX_SAFETY
  .csr_hdcp_rparity_su2a                          (csr_hdcp_rparity_su2a                         ),
  `endif // DWC_DPTX_SAFETY
  //interrupt output
  .hdcp_event                                     (hdcp_event                                    ),
  `ifndef DWC_DPTX_HDCP_DPK_ROMLESS
  //dpk rom interface
  `ifdef DWC_DPTX_HDCP_DPK_8BIT
  .odpkmemreq                                     (dpkmemreq_o                                   ),
  .odpkmemaddr                                    (dpkmemaddr_o                                  ),
  .idpkmemdatai                                   (dpkmemdatai_i                                 ),
  `else // DWC_DPTX_HDCP_DPK_8BIT
  // spyglass disable_block NoFeedThrus-ML
  // SMD: There is feed-through from input '*' to output '*'
  // SJ: Feed-through required by design
  .odpkclk                                        (dpkclk_o                                      ),
  // spyglass enable_block NoFeedThrus-ML
  .odpkaccess                                     (dpkaccess_o                                   ),
  .odpkreq                                        (dpkreq_o                                      ),
  .odpkaddr                                       (dpkaddr_o                                     ),
  .idpkack                                        (dpkack_i                                      ),
  .idpkdatai                                      (dpkdatai_i                                    ),
  `endif // DWC_DPTX_HDCP_DPK_8BIT
  `endif // DWC_DPTX_HDCP_DPK_ROMLESS
  //Random Number Interface
  .orndnumgenena                                  (rndnumgenena_o                                ),
  .irndnum                                        (rndnum_i                                      ),
  //revocmem memory access
  // spyglass disable_block NoFeedThrus-ML
  // SMD: There is feed-through from input '*' to output '*'
  // SJ: Feed-through required by design
  .orevocmemclk                                   (revocmemclk_o                                 ),
  // spyglass enable_block NoFeedThrus-ML
  .orevocmemcs                                    (revocmemcs_o                                  ),
  .orevocmemwen                                   (revocmemwen_o                                 ),
  .orevocmemaddress                               (revocmemaddress_o                             ),
  .orevocmemdatao                                 (revocmemdataout_o                             ),
  .irevocmemdatai                                 (revocmemdatain_i                              ),
  // GPIO I/F (asynchronous)
  .axi_clk                                        (axi_clk                                       ),
  .axi_rst_n                                      (axi_rst_n                                     ),
  .global_gpio_in_o                               (global_gpio_in_o                              ),
  .p0_gpio_in_o                                   (p0_gpio_in_o                                  ),
  .global_gpio_out_i                              (global_gpio_out_i                             ),
  .p0_gpio_out_i                                  (p0_gpio_out_i                                 ),
  // Shale interfaces (AUX port - auxN_clk, I2C port - async)
  .aux_p0_efifo_ready_i                           (aux_p0_efifo_ready_i                          ),
  .aux_p0_efifo_data_i                            (aux_p0_efifo_data_i                           ),
  .aux_p0_efifo_rd_o                              (aux_p0_efifo_rd_o                             ),
  .aux_p0_ififo_data_o                            (aux_p0_ififo_data_o                           ),
  .aux_p0_ififo_valid_bytes_o                     (aux_p0_ififo_valid_bytes_o                    ),
  .aux_p0_ififo_eop_o                             (aux_p0_ififo_eop_o                            ),
  .aux_p0_ififo_wr_o                              (aux_p0_ififo_wr_o                             ),
  // AES/CEE PORT I/F (LINK clock domain)
  .aes0_data_stream0_i                            (aes0_data_stream0_i                           ),
  .aes0_data_stream1_i                            (aes0_data_stream1_i                           ),
  .aes0_empty_i                                   (aes0_empty_i                                  ),
  .aes0_read_o                                    (aes0_read_o                                   ),
  .aes0_authenticated_i                           (aes0_authenticated_i                          ),
  // Display Port Interface
  .num_lanes                                      (hdcpin_num_lanes                              ),
  .dplane0datain                                  (hdcpin_lane0datain                            ),
  .dplane1datain                                  (hdcpin_lane1datain                            ),
  .dplane2datain                                  (hdcpin_lane2datain                            ),
  .dplane3datain                                  (hdcpin_lane3datain                            ),
  `ifdef DWC_DPTX_PSR_OR_128B132B
  .dplanedataenin                                 (hdcpin_data_valid                             ),
  `endif // DWC_DPTX_PSR_OR_128B132B
  `ifdef DWC_DPTX_128B132B
  .dp_link_trainingin                             (hdcpin_linktraining                           ),
  .dp_phy_syncin                                  (hdcpin_phy_sync                               ),
  .dp_placeholderin                               (hdcpin_placeholder                            ),
  `endif // DWC_DPTX_128B132B
  `ifdef DWC_DPTX_FEC
  .fecps_fec_dec                                  (fecps_fec_dec                                 ),
  .fecps_fec_ph                                   (fecps_fec_ph                                  ),
  .fecps_fec_pm                                   (fecps_fec_pm                                  ),
  .fecps_fec_data                                 (fecps_fec_data                                ),
  .enhance_framing_with_fec_en                    (enhance_framing_with_fec_en                   ),
  `endif // DWC_DPTX_FEC
  .dplane0dataout                                 (hdcp_lane0_data                               ),
  .dplane1dataout                                 (hdcp_lane1_data                               ),
  .dplane2dataout                                 (hdcp_lane2_data                               ),
  .dplane3dataout                                 (hdcp_lane3_data                               ),
  `ifdef DWC_DPTX_PSR_OR_128B132B
  .dplanedataenout                                (hdcp_lane_data_en                             ),
  `endif // DWC_DPTX_PSR_OR_128B132B
  `ifdef DWC_DPTX_128B132B
  .dp_link_trainingout                            (hdcp_linktraining                             ),
  .dp_phy_syncout                                 (hdcp_phy_sync                                 ),
  .dp_placeholderout                              (hdcp_placeholder                              ),
  `endif // DWC_DPTX_128B132B
  `ifdef DWC_DPTX_FEC
  .hdcp_fec_dec                                   (hdcp_fec_dec                                  ),
  .hdcp_fec_ph                                    (hdcp_fec_ph                                   ),
  .hdcp_fec_pm                                    (hdcp_fec_pm                                   ),
  .hdcp_fec_data                                  (hdcp_fec_data                                 ),
  `endif // DWC_DPTX_FEC
  .hdcp_sync                                      (hdcp_sync                                     ),
  `ifdef DWC_DPTX_MST
  .hdcp_lvp                                       (hdcp_lvp                                      ),
  `endif // DWC_DPTX_MST
  `ifdef DWC_DPTX_AUXLESS_ALPM
  .oencryption_en_dis_symbols_tgl                 (wencryption_en_dis_symbols_tgl                ),
  `endif // DWC_DPTX_AUXLESS_ALPM
  .enable_blank_screen                            (enable_blank_screen                           ),
  .enable_cpsr                                    (enable_cpsr                                   ),
  .enable_cpbs                                    (enable_cpbs                                   ),
  `ifdef DWC_DPTX_MST
  .enable_ecf0                                    (enable_ecf0                                   ),
  `endif // DWC_DPTX_MST
  .enhance_framing_en                             (enhance_frame_sa2l[0]                         ),
  .ocpsr_timing                                   (wcpsr_timing                                  ),
  .auth_timer100msstart                           (auth_timer100msstart                          ),
  .hdcpclkmgr_timer100mson                        (hdcpclkmgr_timer100mson                       ),
  .auth_timer5sstart                              (auth_timer5sstart                             ),
  .hdcpclkmgr_timer5son                           (hdcpclkmgr_timer5son                          )
  `ifdef DWC_DPTX_SAFETY
  ,
  .icfg_safety_hdcp_inj_en_p                      (wcfg_safety_hdcp_inj_en_p                     ),
  .ocfg_safety_hdcp_inj_done_p                    (wcfg_safety_hdcp_inj_done_p                   ),
  .ocfg_safety_hdcp_err                           (wcfg_safety_hdcp_err                          ),
  .icfg_safety_err_rpt_inj_en                     (wcfg_safety_err_rpt_inj_en                    ),
  .icfg_safety_err_rpt_inj_en_hdcp_aux_rst_2_sa2u (wcfg_safety_err_rpt_inj_en_hdcp_aux_rst_2_sa2u),
  .icfg_safety_err_rpt_inj_en_sa2l                (wcfg_safety_err_rpt_inj_en_sa2l               )
  `endif // DWC_DPTX_SAFETY
  );