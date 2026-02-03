DWC_mipi_unipro_bcm95 #(
  .TMR     (`P_UPRO_SAFETY           ),
  .WIDTH   (8                   +     // CurrentState_s
            `ifdef UPRO_LSS_HS_EN
            TRGUPT_COUNT+             // TrgUpr_Cnt
            1                    +    // TrgTsfrCompleted_Reg
            2                    +    // Trg0TsfrComplete_o
            `ifdef LSS_HS_DIFNDRIVE_UPD_EN
            1                    +    // TXDIFNDrivePh0Ph0b_o
            `endif // LSS_HS_DIFNDRIVE_UPD_EN
            1                    +    // Trg0TsfrOnce
            `endif // UPRO_LSS_HS_EN
            1                    +    // LinkStartupContReq_o
            2                    +    // Trg0Cnt_s
            1                    +    // Trg0AckStore_s
            14                   +    // TActivateCnt_s
            1                    +    // Tick10us_s
            `LDIST_BUF_SIZE      +    // BufferSymEn_s
            BUF_SIZE_WIDTH+           // BufferSize_s
            1                    +    // TxDataAccept_s
            1                    +    // AllLanes_o
            1                    +    // TxCtrlSymbolMask
            1                    +    // LinkStartupCnf_o
            1                    +    // LaneDetectCnf_o
            3                    +    // ActiveTxDataLanes_s
            4                    +    // LocalTxActiveLMask_s
            4                    +    // LocalTxActiveLMask_o
            BUF_SIZE_WIDTH+           // LocalTxActiveLCnt_s
            4                    +    // NextLocalTxActiveLMask_s
            1                    +    // LaneMaskReconfigAck_o
            1                    +    // LaneMaskReconfig_s
            8                    +    // LogicalLaneMapTx_s
            `P_NT_SYM                ), // TxDataSymbolEn_o
  .RSTVAL  ({8'd0                  ,  // CurrentState_s
             `ifdef UPRO_LSS_HS_EN
             {TRGUPT_COUNT{1'b0}}   , // TrgUpr_Cnt
             1'b0                   , // TrgTsfrCompleted_Reg
             2'd0                   , // Trg0TsfrComplete_o
             `ifdef LSS_HS_DIFNDRIVE_UPD_EN
             1'b0                   , // TXDIFNDrivePh0Ph0b_o
             `endif // LSS_HS_DIFNDRIVE_UPD_EN
             1'b0                   , // Trg0TsfrOnce
             `endif // UPRO_LSS_HS_EN
             1'b0                   , // LinkStartupContReq_o
             2'd0                   , // Trg0Cnt_s
             1'b0                   , // Trg0AckStore_s
             14'd0                  , // TActivateCnt_s
             1'b0                   , // Tick10us_s
             {`LDIST_BUF_SIZE{1'b0}}, // BufferSymEn_s
             {BUF_SIZE_WIDTH{1'b0}} , // BufferSize_s
             1'b0                   , // TxDataAccept_s
             1'b0                   , // AllLanes_o
             1'b0                   , // TxCtrlSymbolMask
             1'b0                   , // LinkStartupCnf_o
             1'b0                   , // LaneDetectCnf_o
             3'h4                   , // ActiveTxDataLanes_s
             4'd0                   , // LocalTxActiveLMask_s
             4'd0                   , // LocalTxActiveLMask_o
             {BUF_SIZE_WIDTH{1'b0}} , // LocalTxActiveLCnt_s
             4'hf                   , // NextLocalTxActiveLMask_s
             1'b0                   , // LaneMaskReconfigAck_o
             1'b0                   , // LaneMaskReconfig_s
             8'd0                   , // LogicalLaneMapTx_s
             {`P_NT_SYM{1'b0}}      }) // TxDataSymbolEn_o
  `ifdef P_UPRO_SAFETY_EN
  ,
  .ST_MODE (`P_UPRO_SAFETY_ST_MODE   )
  `endif // P_UPRO_SAFETY_EN
  )
  u_bcm95_reg(
    .clk          (cgpa_TxClk                    ),
    .rst_n        (rgpa_TxResetN                 ),
    .d_in         ({CurrentState_s_nxt          ,
                    `ifdef UPRO_LSS_HS_EN
                    TrgUpr_Cnt_nxt              ,
                    TrgTsfrCompleted_Reg_nxt    ,
                    Trg0TsfrComplete_o_nxt      ,
                    `ifdef LSS_HS_DIFNDRIVE_UPD_EN
                    TXDIFNDrivePh0Ph0b_o_nxt    ,
                    `endif // LSS_HS_DIFNDRIVE_UPD_EN
                    Trg0TsfrOnce_nxt            ,
                    `endif // UPRO_LSS_HS_EN
                    LinkStartupContReq_o_nxt    ,
                    Trg0Cnt_s_nxt               ,
                    Trg0AckStore_s_nxt          ,
                    TActivateCnt_s_nxt          ,
                    Tick10us_s_nxt              ,
                    BufferSymEn_s_nxt           ,
                    BufferSize_s_nxt            ,
                    TxDataAccept_s_nxt          ,
                    AllLanes_o_nxt              ,
                    TxCtrlSymbolMask_nxt        ,
                    LinkStartupCnf_o_nxt        ,
                    LaneDetectCnf_o_nxt         ,
                    ActiveTxDataLanes_s_nxt     ,
                    LocalTxActiveLMask_s_nxt    ,
                    LocalTxActiveLMask_o_nxt    ,
                    LocalTxActiveLCnt_s_nxt     ,
                    NextLocalTxActiveLMask_s_nxt,
                    LaneMaskReconfigAck_o_nxt   ,
                    LaneMaskReconfig_s_nxt      ,
                    LogicalLaneMapTx_s_nxt      ,
                    TxDataSymbolEn_o_nxt        }),
    `ifdef P_UPRO_SAFETY_EN
    .tmr_inj_en   (isafety_tmr_inj_en            ),
    `endif // P_UPRO_SAFETY_EN
    .d_out        ({CurrentState_s          ,
                    `ifdef UPRO_LSS_HS_EN
                    TrgUpr_Cnt              ,
                    TrgTsfrCompleted_Reg    ,
                    Trg0TsfrComplete_o      ,
                    `ifdef LSS_HS_DIFNDRIVE_UPD_EN
                    TXDIFNDrivePh0Ph0b_o    ,
                    `endif // LSS_HS_DIFNDRIVE_UPD_EN
                    Trg0TsfrOnce            ,
                    `endif // UPRO_LSS_HS_EN
                    LinkStartupContReq_o    ,
                    Trg0Cnt_s               ,
                    Trg0AckStore_s          ,
                    TActivateCnt_s          ,
                    Tick10us_s              ,
                    BufferSymEn_s           ,
                    BufferSize_s            ,
                    TxDataAccept_s          ,
                    AllLanes_o              ,
                    TxCtrlSymbolMask        ,
                    LinkStartupCnf_o        ,
                    LaneDetectCnf_o         ,
                    ActiveTxDataLanes_s     ,
                    LocalTxActiveLMask_s    ,
                    LocalTxActiveLMask_o    ,
                    LocalTxActiveLCnt_s     ,
                    NextLocalTxActiveLMask_s,
                    LaneMaskReconfigAck_o   ,
                    LaneMaskReconfig_s      ,
                    LogicalLaneMapTx_s      ,
                    TxDataSymbolEn_o        }    )
    `ifdef P_UPRO_SAFETY_EN
    ,
    .tmr_err      (osafety_bcm95_tmr_err         ),
    .tmr_inj_done (osafety_bcm95_tmr_inj_done    )
    `endif // P_UPRO_SAFETY_EN
    );