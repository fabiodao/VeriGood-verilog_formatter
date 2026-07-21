# RTL Coding Style v1.02

**Author:** Luis Laranjeira

This document provides a set of recommended rules for writing Verilog RTL code, with the objectives of achieving good code readability, obtaining uniform coding style among different digital designers and IP titles, and facilitating RTL code maintainability.

This document is organized in the following sections:

- Text Editor options and text structure
- Structuring the RTL code
- Naming conventions

These rules are to be adopted in new project developments, as well as in substantial developments in existing products. It is recommended to maintain consistency of coding style in existing projects; therefore it is acceptable to keep existing coding style when maintaining legacy source code.

The rules defined in this document can also be extended with additional rules defined by the R&D development team. However, there must be no contradiction between the rules defined in this document, and eventual extensions.

---

## 1. Text Editor Options and Text Structure

### 1.1. Using Spaces and Tabs

It is recommended not to make use of Tabs. Since different Text Editors can convert Tabs to a different number of characters, the alignment between different rows of code can be lost when the code is opened in Text Editors with different configurations. There is an option in most Text Editors that allows converting Tabs to Spaces, therefore avoiding this problem.

> **Tip:** In your editor preferences, set Tab Size to 4 and enable "Replace by space".

The following SpyGlass rule can be used to locate TABs in the Verilog source files:

```tcl
current_goal lint/lint_rtl
set_goal_option addrules STARC-3.1.4.3; #Tabs should not be used.
current_goal none
```

### 1.2. Maximum Code Line Size

In order to avoid having code unintentionally displayed in different rows when viewing in different Text Editors, it is recommended to limit the code line size to **160 characters**. This allows printing full lines with zoom setting of 56% maintaining good readability.

The following SpyGlass rule can be used to check that maximum code line size is not exceeded. By default the maximum allowed is 110 characters, but this value can be changed as in the example below.

```tcl
current_goal lint/lint_rtl
set_goal_option addrules STARC-3.1.4.5;
#The maximum number of characters in one line should not be more than 110.
set_parameter line_length_max 160;
current_goal none
```

### 1.3. Indentation

Recommendation is to use a small number of Space characters for indentation (between 2 and 4), which allows good recognition of code alignment while limiting the maximum size of each line of code.

### 1.4. Code Alignment

It is recommended to always align related code that is distributed among different rows, such as ports in a module declaration or instantiation. Related code between related `begin` and `end` shall be aligned to facilitate readability.

### 1.5. One Statement Per Line

The code will be more readable and maintainable if each statement is written on a separate line.

Example:

```verilog
assign a = 1'b1;
assign b = 1'b1;
```

The following SpyGlass rule can be used to check that only one statement is written per line of code.

```tcl
current_goal lint/lint_rtl
set_goal_option addrules STARC-3.1.4.4;
#Multiple assignments should not be made in one line.
current_goal none
```

---

## 2. Structuring the RTL Code

### 2.1. Sequence of Code in a Verilog Module

The Verilog module shall be written in the following sequence:

1. **(Optional)** In case a file needs to be removed depending on a parameter selection, the first line will contain a statement for that purpose:
   `// reuse-pragma startSub keep_file [IncludeIf {@PARAMETER==1} %subText]`
2. The first line of the file shall contain the following statement, in order to automatically insert the copyright header in coreConsultant:
   `// reuse-pragma startSub [::RCE::insert_copyright] endSub`
3. Module declaration
4. Parameters declaration
5. Ports declaration
6. Signals declaration
7. Combinational and sequential processes
8. The last before `endmodule` shall contain the following statement, used for automatic identification of Perforce file revision:
   `// Revision: $Id: $`
9. End of module declaration
10. **(Optional)** Matching statement in case a file needs to be removed:
    `// reuse-pragma endSub keep_file`

Example:

```verilog
// reuse-pragma startSub keep_file [IncludeIf {@PROJECT_PARAMETER==1} %subText]
// reuse-pragma startSub [::RCE::insert_copyright] endSub
module project_mymodule

  #(//---- PARAMETERS DECLARATION ------------------------------------------------
    parameter REG_SIZE  = 32, // Size of register (number of bits)
    parameter REG_DELAY = 10  // Delay from clk to data_output
  )

  (//---- PORTS DECLARATION ------------------------------------------------------
    input  wire                 clk,
    input  wire                 rst_n,
    input  wire                 data_en,
    input  wire [REG_SIZE-1:0]  data_input,
    output reg  [REG_SIZE-1:0]  data_output
  );

  //---- SIGNALS DECLARATION -----------------------------------------------------
  // ...

  //---- COMBINATIONAL/SEQUENTIAL PROCESSES --------------------------------------
  // ...

// Revision: $Id: $
endmodule
// reuse-pragma endSub keep_file
```

### 2.2. Order of Port Declaration

Ports shall be declared per groups of functions. For each function, declare inputs, then outputs, and then input/output.

Example:

```verilog
module project_top2
  (//---- PORTS DECLARATION ------------------------------------------------------

  //==== APB SLAVE INTERFACE ===================================================
  input  wire        pclk,
  input  wire        presetn,
  input  wire        psel,
  input  wire  [2:0] paddr,
  input  wire        penable,
  input  wire        pwrite,
  input  wire [31:0] pwdata,
  output wire [31:0] prdata,

  //==== IDI INTERFACE =========================================================
  output wire        idi_clk_data,
  output wire [31:0] idi_csi_data,
  output wire  [3:0] idi_bytes_en,
  output wire        idi_data_en,
  output wire  [5:0] idi_data_type,
  output wire  [3:0] idi_dvalid,
  output wire  [7:0] idi_ecc,
  output wire        idi_header_en,
  output wire  [3:0] idi_hvalid,
  output wire  [1:0] idi_virtual_channel,
  output wire  [3:0] idi_vvalid,
  output wire [15:0] idi_word_count,

  //==== RAM INTERFACE =========================================================
  input  wire [63:0] ipi_ram_rdata,
  output wire        ipi_ram_rclk,
  output wire  [7:0] ipi_ram_raddr,
  output wire        ipi_ram_ren,
  output wire        ipi_ram_wclk,
  output wire  [7:0] ipi_ram_waddr,
  output wire [63:0] ipi_ram_wdata,
  output wire        ipi_ram_wen,

  //==== IPI INTERFACE =========================================================
  input  wire        ipi_pixclk,
  output wire        ipi_vsync,
  output wire        ipi_hsync,
  output wire        ipi_pixen,
  output wire        ipi_odd_line,
  output wire        ipi_odd_pixel,
  output wire [47:0] ipi_pixdata
  );
```

### 2.3. Instantiating Modules

When instantiating a module, port connections shall be written in different rows using explicit port connections. Parameters shall be redefined explicitly. The code shall be aligned as shown in the following examples.

Example with parameters:

```verilog
project_mymodule #(
  .REG_SIZE  ( 8 ),
  .REG_DELAY ( 20)
  )
  u1_mymodule (
    .clk         ( clk          ),
    .rst_n       ( rst_n        ),
    .data_en     ( data1_en     ),
    .data_input  ( data1_input  ),
    .data_output ( data1_output )
    );
```

Example with no parameters:

```verilog
project_mymodule
  u2_mymodule (
    .clk         ( clk          ),
    .rst_n       ( rst_n        ),
    .data_en     ( data2_en     ),
    .data_input  ( data2_input  ),
    .data_output ( data2_output )
    );
```

### 2.4. Writing ALWAYS Statements

Always statements shall be written according to the following examples.

```verilog
always @(posedge pixclk or negedge pixel_rst_n) begin : frame_start_hold_PROC
  if (!pixel_rst_n)
    frame_start_hold <= 1'd0;
  else
    if (frame_sync_err)
      frame_start_hold <= 1'd1;
    else
      if (frame_start_ack)
        frame_start_hold <= 1'd0;
end // frame_start_hold_PROC
```

```verilog
always @(posedge pixclk or negedge pixel_rst_n) begin : current_state_reg_PROC
  if (!pixel_rst_n) begin
    state    <= SYSTEM_IDLE;
    vsync    <= 1'd0;
    hsync    <= 1'd0;
    new_line <= 1'd0;
  end else begin
    state    <= nxtstate;
    vsync    <= nxtvsync;
    hsync    <= nxthsync;
    new_line <= prenewline;
  end
end // current_state_reg_PROC
```

### 2.5. Writing CASE Statements

Case statements shall be written according to the following examples.

```verilog
always @(*) begin : line_event_src_PROC
  case (detstate)
    SYNC_UNSET       : line_event_src = line_start_dly | video_packet_dly;
    SYNC_LINE_START  : line_event_src = line_start_dly;
    SYNC_BLANKING    : line_event_src = bl_event_dly;
    SYNC_VIDEO       : line_event_src = video_packet_dly;
  endcase
end // line_event_src_PROC
```

```verilog
always @(*) begin : nxtdetstate_PROC
  case (detstate)
    SYNC_UNSET : begin
      if (line_start_dly)
        nxtdetstate = SYNC_LINE_START;
      else if (bl_event_dly)
        nxtdetstate = SYNC_BLANKING;
      else if (video_packet_dly)
        nxtdetstate = SYNC_VIDEO;
      else
        nxtdetstate = SYNC_UNSET;
    end
    SYNC_LINE_START : begin
      if (frame_start_dly)
        nxtdetstate = SYNC_UNSET;
      else
        nxtdetstate = SYNC_LINE_START;
    end
    SYNC_BLANKING : begin
      if (line_start_dly)
        nxtdetstate = SYNC_LINE_START;
      else if (frame_start_dly)
        nxtdetstate = SYNC_UNSET;
      else
        nxtdetstate = SYNC_BLANKING;
    end
    SYNC_VIDEO : begin
      if (line_start_dly)
        nxtdetstate = SYNC_LINE_START;
      else if (bl_event_dly)
        nxtdetstate = SYNC_BLANKING;
      else if (frame_start_dly)
        nxtdetstate = SYNC_UNSET;
      else
        nxtdetstate = SYNC_VIDEO;
    end
  endcase
end // nxtdetstate_PROC
```

### 2.6. Global Constants

Use a separate file to store constants used in the module. There shall be one file containing all constants used in all the modules of a design.

### 2.7. Assigning One Signal Per Process

Assign only one signal per process in order to improve readability and facilitate the process of commenting the code. For closely related signals, more than one signal per process may be used provided that code readability and commenting are not negatively impacted.

### 2.8. Using Auxiliary Signals

Define auxiliary signals to replace complex conditions from combinational and sequential processes. This improves readability and facilitates commenting both the complex conditions and the processes.

Example:

```verilog
assign advance_rd_pnt = ( (iq_num_cnt_r==iq_num_rx) & rd_req_rx & pend_rd_pnt_update ) ?
                        (rd_pnt == ret_start_addr) : 1'b0;

always @(posedge rd_rx_clk or negedge rd_rst_n) begin : rd_pnt_PROC
  if (!rd_rst_n)
    rd_pnt_r <= {`DRF4GM_RX_RADIO_BUF_AWIDTH{1'b0}};
  else
    if (advance_rd_pnt)
      rd_pnt_r <= (read_ret_frame) ? rx_radio_buf_rd_addr_r : advance_rd_pnt_addr;
end // rd_pnt_PROC
```

### 2.9. Commenting the Code

Use comments consistently throughout the code, providing the reader with valuable information on the intention behind the code. Comments shall be concise and clear. Avoid comments inside the RTL processes. Place them just above the processes.

### 2.10. Commenting Macros and ALWAYS Statements

Add comments to the macros and Always statements in order to pair them and facilitate RTL code inspection.

Examples:

```verilog
`ifdef <condition>
  // ...
`endif // <condition>

always @(...) begin : <process_name>
  // ...
end // <process_name>
```

---

## 3. Naming Conventions

### 3.1. Module Names

Module names shall use the project name as a prefix, and file names shall match the module names.

Example for Project "DWC_pcie_edma":

```
DWC_pcie_edma.v
DWC_pcie_edma_ahb_bridge.v
DWC_pcie_edma_cc_constants.v
DWC_pcie_edma_constants.v
DWC_pcie_edma_context.v
DWC_pcie_edma_crgb_gen.v
DWC_pcie_edma_ctrl.v
DWC_pcie_edma_bcm21.v
DWC_pcie_edma_bcm22.v
```

### 3.2. Module Instance Names

Module instance names shall use `u_` as a prefix, followed by module name. In order to shorten the instance name, the project name prefix can be removed. If more than one instance is required, then it is recommended to use `u1_`, `u2_`, etc, as prefix. In order to facilitate understanding of the functionality, a suffix can be added, especially when there are several instances of the same module:

- **Module name:** `<project_name>_<module_name>`
- **Instance name:** `u1_<module_name>_<description>`

Example of instance names for module `DWC_hdmi_tx_bcm23`:

```
u1_bcm23_pixelswrst
u2_bcm23_prepswrst
u3_bcm23_tmdsswrst
u4_bcm23_i2sswrst
u5_bcm23_spdifswrst
```

### 3.3. Use of Lower/Upper Case

It is recommended to use **lower case** for: module name (except the project name that is used as a prefix), module instance name and signal name. Exceptions could be considered when signals are defined in a standard specification.

**Upper case** shall be used for parameter names.

When instantiating an IP (e.g. PHY) together with a Controller, the digital signals that connect both IPs (e.g. Controller/PHY interface) shall be written in lowercase, while the IP signals that connect directly to top-level shall maintain the name used in the mixed-signal IP (which in the case of PHYs means using uppercase).

### 3.4. Naming All Processes

Name all processes with suffix `_PROC`. This can be useful to navigate the processes in the simulator.

Example:

```verilog
// Registering output
always @(posedge pclk or negedge presetn) begin : prdata_PROC
  if (!presetn)
    prdata <= 8'b0;
  else
    if (rd_en)
      prdata <= rdata;
end // prdata_PROC
```

### 3.5. Naming FSM States

Use localparams to define FSM state names.

Example:

```verilog
localparam [FSM_WIDTH-1:0] PROCESS_REQUESTS = 0;
localparam [FSM_WIDTH-1:0] SEND_DUMMY       = 1;
localparam [FSM_WIDTH-1:0] SEND_NACK        = 2;
```

### 3.6. Signal Names

In order to avoid conflicts with tools like coreConsultant, the use of `error`, `failed` and `violated` is prohibited.

The following table defines suffixes to be added to signal names, in order to facilitate identification of signal type. Exceptions could be considered when signal names are defined in standard specifications (e.g., in AMBA APB, reset signal is named `presetn`).

| Signal Type | Suffix | Examples |
|---|---|---|
| Clock (rising edge) | `clk` | `clk`, `pclk`, `ipixelclk` |
| Reset (active low) | `rst_n` | `rst_n`, `idi_rst_n`, `iapb_rst_n` |
| Enable (active high) | `en` | `idataen`, `rx_byte_en` |
| Enable (active low) | `en_n` | `ctrl_out_wr_en_n` |
| Rising edge detection pulse | `_re` | `packet_sent_re` |
| Falling edge detection pulse | `_fe` | `data_tx_completed_fe` |
| Toggle | `_tgl` | `ackwitherr_tgl` |
| Delayed version by N clock cycles | `_<N>d` | `data_ready_1d`, `data_ready_2d` |
| Unconnected | `_unc` | `LA_PowerModeInd_unc` |
| Quasi-static | `_qst` | `tx_clc_len_qst` |
| Interrupt event | `_irq` | `main_irq`, `fifo1_irq` |

Global parameters, typically defined in a file named `<Project_name>_cc_constants.v`, shall use the project name as prefix, and use upper case.

Example:

```verilog
`define CSI2_HOST_NUMBER_OF_LANES
`define CSI2_HOST_SNPS_PHY
`define CSI2_HOST_EXT_PPIP
```

### 3.7. Polarity of Signals

The use of the following polarities / active edges is recommended:

- Rising edge clocks
- Active low reset signals
- Active high enable signals

---

## Revision History

| Version | Date | Description |
|---|---|---|
| 1.02 | 16 March 2016 | Replacing Leda rules by corresponding SpyGlass rules. |
| 1.01 | 24 July 2015 | Removed prohibition of using "err" in signal names (section 3.6). Removed "_r" from list of suffixes to use (section 3.6). |
| 1.00 | 20 April 2015 | Unified RTL coding style rules based on the practice of HDMI/MHL and MIPI CSI-2/DSI Controller R&D teams. |
