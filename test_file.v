wire   [3:0] sdp_state, sdp_return_state             ;
reg    [3:0] sdp_state_nxt, sdp_return_state_nxt     ;
reg   [31:0] sdp_regs [0:`DWC_DPTX_SDP_NUM_OF_REGS-1];
reg   [31:0] audio_sdp_regs [0:7]                    ;
reg   [31:0] audio_sdp_regs_nxt [0:7]                ;
reg  [287:0] audio_sdp_regs_sampled                  ;
`ifdef DWC_DPTX_SAFETY
reg    [3:0] audio_sdp_regs_parity [0:7]             ;
wire   [3:0] audio_sdp_header_parity                 ;
reg    [3:0] audio_sdp_regs_parity_nxt [0:7]         ;
reg   [35:0] audio_sdp_regs_sampled_parity           ;