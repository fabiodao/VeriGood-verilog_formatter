# DWC DisplayIP Coding Style and Design Guidelines

**Version 2.41** | Display IP Implementation Team

---

## Contents

1. [Text Editor Options and Text Structure](#1-text-editor-options-and-text-structure)
2. [Structuring the RTL Code](#2-structuring-the-rtl-code)
3. [Naming Conventions](#3-naming-conventions)
4. [Design Guidelines](#4-design-guidelines)
5. [Architecture Guidelines](#5-architecture-guidelines)
6. [Revision History](#6-revision-history)

---

## 1. Text Editor Options and Text Structure

The following document provides a set of rules that complement the ones described in the general Coding Style described in `RTL_Coding_Style_v1.02.md`. Prior to reading this guide it is highly recommended that you get familiar with the above described document as the rules here described do not collide neither contradict the ones defined in the general Coding Style document.

### 1.1 Using Spaces and Tabs

Refer to RTL_Coding_Style_v1.02.

### 1.2 Maximum Code Line Size

Refer to RTL_Coding_Style_v1.02.

**Rule:** Initial comments with block description shall not pass the line size limit of 160.

**Rule:** `// *****` code separators shall not pass the line size limit of 160.

### 1.3 Indentation

**Guideline:** Use 2 spaces for code indentation.

**Rule:** Add initial two-space indentation in all code inside a module.

**Guideline:** Align comments with their corresponding RTL code fragment.

```verilog
always @(*) begin : ccomb_PROC
  // Load adder value according to enable.
  wadder = wcounter || wadderen;
end
```

### 1.4 Code Alignment

Refer to RTL_Coding_Style_v1.02.

### 1.5 One Statement Per Line

Refer to RTL_Coding_Style_v1.02.

**Guideline:** There shall be only one `;` per line.

---

## 2. Structuring the RTL Code

### 2.1 Sequence of Code in Verilog Module

Refer to RTL_Coding_Style_v1.02.

**Guideline:** Parameters (overridable at instantiation) shall be listed at module declaration.

**Guideline:** Local parameters shall be listed after module declaration.

**Rule:** All modules shall include a Description comment section after port declaration.

**Rule:** All top level functional modules shall have their ports described in a comment in the same line following the port declaration.

**Guideline:** While constructing the combinational and sequential process section in your RTL code, please sequence your RTL code in a logical easy to follow way. Start by composing (always blocks and/or assigns) signals that only depend on inputs. Then you can use those signals to compose others that need to be created by more complex combinations (either sequential and/or combinatorial). Finish by composing those that output the module. If there are signals that output the module but are used internally, use your best discretion to group them with those that make sense. In a nutshell, you should try to compose signals prior to using them as much as possible.

Example:

```verilog
module DWC_hdmi_my_block #(
  parameter MP_MY_PARAM = 10
  )
  (
  input  wire       itmdsclk      , // Clock
  input  wire       itmdsrstz     , // Reset
  input  wire       itmdsen       , // Synchronous enable
  input  wire [7:0] imy_tmdsdata  , // Input data interface
  output wire [7:0] omy_tmdsdata    // Output data interface
  );

  //****************************************************************************
  // Description:
  // My Block is used for logic operations

  localparam LP_MY_PARAM = 1;

  wire [7:0] wlocaldata;

  // ...

endmodule
```

### 2.2 Port Declaration

Follow guidelines in RTL_Coding_Style_v1.02.

**Guideline:** Avoid single line comments in between port declarations.

**Guideline:** Align port `,` with right most port declaration characters (or after the last right-side character, with no space).

**Guideline:** While listing your module ports try to follow (as much as possible) this order:

1. Clock, Reset, Enable (group per clock domain and for all clock domains)
2. All `qst` inputs that control the module
3. All inputs that control the module originated in register bank
4. All inputs that control the module and are originated in other modules
5. All data input(s)/output(s) (that might be modified by your module), organized by function
6. All outputs that will control other modules
7. All status outputs (to register bank)
8. All interrupt outputs (to interrupt handler)

**Guideline:** Use right side comma alignment instead of single line comments for port declaration.

**Guideline:** Minimize spaces in all signal/pin declarations while keeping the `]`s aligned with one space to the signal name. Alignment is done consistently within each file (independently from other files).

**Guideline:** No spaces between `[]`.

Example:

```verilog
module DWC_hdmi_my_block(
  input  wire        itmdsclk       , // Clock (point 1)
  input  wire        itmdsrstz      , // Reset
  input  wire        itmdsen        , // Sync enable
  input  wire        ihdcprstz      , // Module specific reset
  input  wire        isfrclk        , // Configuration interface clock
  input  wire        isfrrstz       , // Configuration interface reset
  input  wire        isfren         , // Configuration interface sync enable
  input  wire        icfg_xpto_qst  , // Qst configuration input (point 2)
  input  wire        icfg_config    , // Configuration input (point 3)
  input  wire        iopmode        , // Operation mode (point 4)
  input  wire [15:0] imy_intf_0     , // Input data interface 0 (point 5)
  output wire [15:0] omy_intf_0     , // Output data interface 0 (point 5)
  input  wire  [7:0] imy_intf_1     , // Input data interface 1 (point 5)
  output wire  [7:0] omy_intf_1     , // Output data interface 1 (point 5)
  input  wire  [7:0] imy_intf_2     , // Input data interface 2 (point 5)
  output wire  [7:0] omy_intf_2     , // Output data interface 2 (point 5)
  output wire        onr_of_lanes   , // Control other modules (point 6)
  output wire        ocfg_status    , // Status output (point 7)
  output wire        ocfg_int0_irq    // Interrupt output (point 8)
  );
```

### 2.3 Wires Declaration

**Guideline:** The `;` are to be aligned to the end of the longest signal name (no space between the signal and semicolon).

**Guideline:** Follow the same rules defined in "Port declarations" regarding the signals' widths.

```verilog
wire [47:0] wfifo_rd_busa_data       ;
wire [47:0] wfifo_rd_busb_data       ;
wire [47:0] wfifo_rd_busc_data       ;
wire [47:0] wfifo_rd_busd_data       ;
wire        wfifo_rd_busa_hsync      ;
wire        wfifo_rd_busb_hsync      ;
wire        wfifo_rd_busc_hsync      ;
wire        wfifo_rd_busd_hsync      ;
wire        wfifo_rd_busa_vid_dataen ;
wire        wfifo_rd_busb_vid_dataen ;
wire        wfifo_rd_busc_vid_dataen ;
wire        wfifo_rd_busd_vid_dataen ;
wire  [3:0] wfifo_rd_ipi_format      ;
wire  [3:0] wfifo_rd_hdmi_color_depth;
```

### 2.4 Assignments

**Guideline:** `=`/`<=` aligned along all assignments in a group (between `begin..end` or group of `assign`).

**Guideline:** Single space after `=`/`<=`.

**Guideline:** No spaces between RHS (right hand side) value/variable and `;`.

```verilog
assign a = signal;
assign b = other_signal;
```

### 2.5 Instantiating Modules

Refer to RTL_Coding_Style_v1.02.

**Guideline:** At component instantiation, the connection of buses must be performed without bus width, unless strictly necessary (when a subset of bus is required).

**Guideline:** There shall be no empty lines in between port connections.

**Guideline:** At instantiation follow the same port order described in module declaration.

**Guideline:** Opening `(` must be 1 space after the longest signal/parameter, connecting wire shall be immediately after the opening `(` and closing `)` must be immediately after the longest signal/parameter (no space).

**Guideline:** Within one block instantiation, `()` shall be aligned independently across parameters and signals.

**Guideline:** Alignment is done independently for each module instantiation.

```verilog
DWC_hdmi_my_block_a u_my_block_a(
  .itmdsclk    (itmdsclk    ),
  .itmdsrstz   (itmdsrstz   ),
  .itmdsen     (itmdsen     ),
  .imy_tmdsdata(imy_tmdsdata),
  .omy_tmdsdata(omy_tmdsdata)
  );

DWC_hdmi_my_block #(
  .MP_MY_PARAM(9)
  )
  u_my_block(
    .itmdsclk    (itmdsclk    ),
    .itmdsrstz   (itmdsrstz   ),
    .itmdsen     (itmdsen     ),
    .imy_tmdsdata(imy_tmdsdata),
    .omy_tmdsdata(omy_tmdsdata)
  );
```

### 2.6 Writing Always Statements

Refer to RTL_Coding_Style_v1.02.

**Guideline:** The `begin` and `end` placement in `if` and `for` should follow this structure:

```verilog
if (ia==ib) begin
  // ...
end else begin
  // ...
end
```

```verilog
if (ia==ib) begin
  rassing <= wmy_value;
end else begin
  if (ia<ib) begin
    rassing <= wtheir_value;
  end else begin
    rassing <= wno_value;
  end
end
```

```verilog
if (ia==ib) begin
  rassing <= wmy_value;
end else begin
  if (ia<ib) begin
    rassing <= wtheir_value;
  end else begin
    if (wmy_signal) begin
      rassing <= wno_value;
    end
  end
end
```

```verilog
for (i=0; i<10; i=i+1) begin
  // ...
end
```

**Guideline:** `begin`/`end` pairing shall always be present even if single condition exists.

**Guideline:** `end else begin` shall always be used for defining an else branch to conditional if construct.

### 2.7 Writing Case Statements

Refer to RTL_Coding_Style_v1.02.

**Guideline:** `default` case statement may be included if not all possible conditions are described in the case body (its inclusion is not mandatory for sequential blocks, but may be required for combinational blocks in order to avoid latch prone code).

```verilog
case (ia)
  2'd0 : begin
    // ...
  end
  2'd1 : begin
    // ...
  end
  default : begin
    // ...
  end
endcase
```

### 2.8 Functions

**Guideline:** Functions shall be declared before they are used. Exception made for functions that are reused multiple times, which are declared before the first use.

```verilog
function [2:0] <function_name>(
  // ...
endfunction // <function_name>

assign a = <function_name>(function_parameters);
```

### 2.9 Global Constants

Refer to RTL_Coding_Style_v1.02.

Example file: `DWC_hdmi_tx_constants.v`

**Guideline:** These global constants shall be prefixed in the same way as the global defines (`<Project_name>`).

```verilog
`define HDMI_RX_MY_CONSTANT 1
```

### 2.10 Assign One Signal Per Process

Refer to RTL_Coding_Style_v1.02.

```verilog
always @(posedge iclk or negedge irst_n) begin : sseq_PROC
  if (!irst_n) begin
    rmy_status <= 1'b0;
    rmy_action <= 4'd0;
  end else begin
    if (!ien) begin
      rmy_status <= 1'b0;
      rmy_action <= 4'd0;
    end else begin
      if (iactive) begin // When active, flag active status
        rmy_status <= 1'b1;
      end
      if (rmy_status && (rmy_action <= 4'hF)) begin // When active, count until limit
        rmy_action <= rmy_action + 4'h1;
      end
    end
  end
end // sseq_PROC
```

### 2.11 Using Auxiliary Signals

Refer to RTL_Coding_Style_v1.02.

**Guideline:** Any condition that requires a logic combination of more than 3 signals shall be converted into an auxiliary signal.

```verilog
assign wmy_auxiliary = ia && (~ib) && ic || (~id);
```

**Guideline:** Any condition that requires a logic combination of more than 2 conditions shall be converted into an auxiliary signal.

```verilog
assign wmy_auxiliary = (ia != 2'b00) && ( (ia == 2'b00) || (ib == 1'b1) );
```

**Guideline:** Any condition that is used more than one time through the module shall be converted into an auxiliary signal.

### 2.12 Commenting the Code

Refer to RTL_Coding_Style_v1.02.

**Guideline:** Comments shall always start by `//`.

**Guideline:** Every comment must have a space after the `//`.

**Guideline:** All comment statements must start with an upper case character; if multiple sentences are present in the same comment block, they must be punctuated.

**Guideline:** Comments can be aligned if it makes them more readable (that is, add spaces after `;` until the `//` "comment column").

**Guideline:** Within a module, the Revision ID comment is the only indentation exception, not having indentation before the `//`.

**Guideline:** Comments enclosed in `/**/` are not allowed (the objective is to ease statistic collection tools).

**Guideline:** Comments shall always break at line size defined previously.

```verilog
// This is the comment start and it is too long to fit in one line
// this is the rest of the above comment.
```

```
// **************************************************************************
// Description
// This 1st statement is short and fits in one line.
// This 2nd statement is too long to fit in one line; this is the first part
// and this is the rest of the statement.
// **************************************************************************
```

```verilog
assign a = signal;       // This comment may be aligned with the one below
assign b = other_signal; // Other comment
```

### 2.13 Closing Macros, Always Statements and Functions

Refer to RTL_Coding_Style_v1.02.

```verilog
`ifdef <condition>
  // ...
`endif // <condition>

always @(*) begin : <process_name>
  // ...
end // <process_name>

function [2:0] <function_name>(
  // ...
endfunction // <function_name>
```

---

## 3. Naming Conventions

### 3.1 Module Names

Refer to RTL_Coding_Style_v1.02.

**Guideline:** The `<project_name>.v` shall be used as the toplevel of the RTL project.

Example: `DWC_hdmi_rx.v`

**Guideline:** Module names should include their hierarchy, except in modules that implement common functionality that are reused in multiple hierarchies. The module names should follow the following structure: `<project_name>_<hierarchy>_<functional_name>`.

- Top modules: `avp`, `cec`, `main`
- Sub-modules: `avp_audproc`, `main_resetmanager`, etc
- Sub-sub-modules: `avp_audproc_xpto`, etc
- Reused modules: `common_*`

### 3.2 Module Instance Names

Refer to RTL_Coding_Style_v1.02.

**Guideline:** When several instances of the same module are required and if the underlying function of those instances is easy to identify by a simple suffix, then consider adding suffix descriptions instead of `u<number>_` format, to ease identification of function (e.g. in waveform visualizers).

```
u1_bcm22_pixelswrst
u2_bcm22_pixelswrst
u_bcm22_prepswrst
u_bcm22_tmdsswrst
u_bcm22_i2sswrst
u_bcm22_spdifswrst
```

**Guideline:** Hierarchical parts of the module name shall not be part of the instance name, that is, the instances should follow the structure: `u[<number>]_<functional_name>[_<suffix>]`.

Example: Instance of module `DWC_hdmi_qp_tx_avp_audproc_xpto` is named `u_xpto`. Full hierarchy will be `u_top.u_avp.u_audproc.u_xpto`.

**Guideline:** BCM instance names shall have a suffix indicating the synchronization domains involved as follows: `_<source>2<destination>`.

- `<source>` — Single letter designating the source clock.
- `<destination>` — Single letter designating the destination clock.

```
u_bcm21_<name_descriptor>_s2d
u_bcm25_<name_descriptor>_s2d
u_bcm36_<name_descriptor>_s2d
```

### 3.3 Use of Lower/Upper Case

Refer to RTL_Coding_Style_v1.02.

**Guideline:** Do not use camelCase naming to prevent ambiguity and eventual Linting tool warnings.

### 3.4 Naming All Processes

Refer to RTL_Coding_Style_v1.02.

**Guideline:** Use `s<name>_PROC` for sequential always procedural blocks names.

**Guideline:** Use `c<name>_PROC` for combinational always procedural blocks names.

### 3.5 Naming FSM States (Parameters)

Refer to RTL_Coding_Style_v1.02.

**Guideline:** Parameters used to describe FSM states shall use the following prefix `ST_`.

```verilog
localparam [1:0] ST_IDLE    = 2'd0;
localparam [1:0] ST_SEND    = 2'd1;
localparam [1:0] ST_RECEIVE = 2'd2;
localparam [1:0] ST_WAIT    = 2'd3;
```

### 3.6 Signal Names

Refer to RTL_Coding_Style_v1.02.

#### 3.6.1 Common Abbreviations

| Abbreviation | Description |
|---|---|
| `ovr` | Short for "override" used in registers according to section 3.8 |
| `thr` | Short for "threshold" |
| `pkt` | Short for "packet" |
| `addr` | Short for "address" |
| `op` | Short for "operational" or "operation" |
| `val` | Short for "value" |
| `byp` | Short for "bypass" |
| `vc` | Short for "virtual channel" |
| `rsvd` | Short for "reserved" |
| `chg` | Short for "change" |

#### 3.6.2 Prefixes

| Prefix | Description |
|---|---|
| `cfg` | Short for "configuration" used in registers according to section 3.7 |
| `ctrl` | Short for "control" used in registers according to section 3.7 |

#### 3.6.3 Suffixes

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

**Guideline:** For unconnected ports do not use wires with name `_unc` but instead use `/*UNCONNECTED*/` in the port instantiation.

**Guideline:** Additional Port, signal and register suffixes:

| Suffix | Description |
|---|---|
| `rst` | Suffix for active high reset signals |
| `clk_n` | Suffix for active low clock signals (to be used as posedge at always block) |
| `init_n` | Suffix for active low synchronous reset |
| `en_n` | Suffix for "Flip-Flop enable", active low |
| `en` | Suffix for "Flip-Flop enable", active high |
| `_<N>d` | When used in ports indicates that the signal is a delayed version of its original; usage of `<N>` is optional to allow for modules where the number of delay cycles is not known. Indicates the corresponding signal passes transparently through the module (simply delayed). |
| `_<N>pipe` | If a delay is implemented with some control logic (such as an enable), and it is convenient for code clarity to add a suffix, use `_<N>pipe`. Do not use `_<N>d` in this case. |
| `_sd` | Suffix to append to the name of a shift-register used to delay a signal multiple cycles. Index i of this shift-register corresponds to the original signal delayed i+1 clock cycles. |
| `_s<src>2<dst>` | For signals that pass through a synchronism cell (BCM). `<src>` = single letter for source clock, `<dst>` = single letter for destination clock. E.g.: `wdone_sh2c` (BCM21 from h to c). For BCM36 cells, `_s<src>2<dst>` should be the last suffix. E.g.: `wconfig_qst_sc2h`. When from register bank with `cfg` prefix: `wcfgh_datasize_sh2c`. |
| `_p` | Single clock pulse |
| `_e` | Error or invalid condition signals |
| `_st` | Interrupt generating status signals. E.g.: `ocfg_done_st` is updated and `ocfg_done_irq` interrupt is generated. |
| `_sts` | **Not allowed.** |
| `_cnt` | Counter |
| `_p<N>` | Auxiliary signal/bus representing original value plus N |
| `_m<N>` | Auxiliary signal/bus representing original value minus N |

#### 3.6.4 Signal Naming

**Guideline:** Do not use `reset`, `rst`, `rst_n` naming on any signals but asynchronous resets.

**Guideline:** Do not use `init`, `init_n` naming on any signals but synchronous resets.

**Guideline:** Do not use `clk` or `clock` naming for any signal in design but the actual clock signal.

**Guideline:** Do not use `fix` or `fixed` naming for any signal to avoid confusion with bug fixes or chicken bits. Use `tie`, `lock`, `constant`, or similar names instead.

**Guideline:** In a design where synchronous enable and active low resets are used, the Clock signal should have associated with it an active low reset and a synchronous active high enable signal, e.g. `imainclk`, `imainen` and `imainrst_n`.

**Guideline:** Generically a signal should have composing words separated by underscore (e.g. `my_signal_name` instead of `mysignalname`).

**Requirement:** Clocks, resets, enables and init's must not use underscores between name and suffix (`clk`, `rst_n`, `en`, `init_n`).

**Requirement:** In order to avoid conflicts with parsing tools, the use of the following words is prohibited for active code (registers, signals, parameters, macros, messages, etc.), in any lower/upper case, or any derived words that include these:

- `error`
- `fail`
- `violated` / `violation`

Suggested alternatives to the prohibited words:

- `err`
- `viol`

> **Note:** Use of prohibited words in code comments is allowed.

### 3.7 Register Names

**Requirement:** Configuration, Control and Status registers of a module with fields related with multiple functions must be named as `<module_prefix>_<config|control|status>_N`, N ∈ {0, 1, 2, …}. Starting at 0 is mandatory. If the register is fully related with a specific functionality, then it can be named as `<module_prefix>_<functionality>`.

Register types definition:

- **Config** – feature configuration before startup
- **Control** – controls operation during runtime

Rules:

- Config registers must be RW
- Status registers must be R
- Control can be either W or RW
- Type W can only be used on Control registers
- Type W fields must have `_p` suffix
- Fields ending in `_p` must be in W registers

### 3.8 Override Register Fields

Register Fields can be used to override the behavior of the Controller relative to the Specifications that it is compliant to. These overrides are intended to allow better debugging of erroneous scenarios, workarounds, lock situations and out-of-spec behaviors to improve robustness.

**Guideline:** Use `ovr_en` and `ovr_value` suffixes for the Overrides Register Fields.

**Guideline:** If `ovr_value` reset value corresponds to default value and other values can be configured (absence of `ovr_en` control), then it's not an override register. E.g. `timer_ovr_value` → `timer_value`.

### 3.9 Polarity of Signals

Refer to RTL_Coding_Style_v1.02.

### 3.10 Port, Signal and Register Prefixes

| Prefix | Description |
|---|---|
| `i` | Prefix for input ports |
| `o` | Prefix for output ports |
| `io` | Prefix for bidir ports |
| `r` | Prefix for registers. Not applicable to ports. |
| `w` | Prefix for wires. Not applicable to ports. |
| `v` | Prefix for variables (integers or reals) |

**Guideline:** The prefixes `i`, `o` and `io` shouldn't be used in conjunction with `r`, `w` prefixes (e.g. `iwsignal` and `ivsignal` are not allowed).

**Guideline:** Character `_` is recommended throughout signal names to improve readability.

**Guideline:** It's desirable that ports associated with a certain interface be described with a common prefix that indicates the interface type. E.g. `ivid_xxx` or `ovid_yyy`.

**Guideline:** Inputs include "name" of previous module and outputs the "name" of the current module.

**Guideline:** The `w` prefix should be used for verilog registers that are only used in combinational blocks (if synthesis results in a flip-flop, the signal should have an `r` prefix and an `_r` suffix).

**Guideline:** When possible, signal names (clocks, resets, enables, dataports, etc.) should be passed through the hierarchy without changing their names (this may be invalid for reusable modules, e.g. BCM parts). Prefixes and `_<N>d` or `_<N>pipe` suffixes are not considered as part of the signal name.

### 3.11 FSM

**Guideline:** State transitions should be coded in individual always blocks. The Designer may choose to separate the FSM sequential portion from the combinational state transition (ending with one simple sequential always plus one combinational always).

**Guideline:** Each control signal should be coded in a separate always block and never in the main FSM block.

**Guideline:** Try to keep only one FSM per module.

**Guideline:** Document control signals and state transitions. Remember that you may be called to correct/change the FSM behavior in the future and you need to understand what functionality is implemented.

| Name | Description |
|---|---|
| `r<fsmname>_curstate` | FSM current state vector |
| `[r\|w]<fsmname>_nextstate` | FSM next state vector (`r` or `w` according to type register or wire respectively) |

**Guideline:** If the module contains only one FSM then current state vector and next state vector names shall be `rcurstate` and `wnextstate`.

### 3.12 Code Separation

**Guideline:** If possible don't use more than 1 empty line separation between subjects inside an always block and no more than 2 empty lines between other different RTL subjects.

**Guideline:** Don't leave empty lines at top-of-file.

**Guideline:** Don't leave more than one empty line at the end of file.

### 3.13 Parameter Prefixing

**Guideline:** With exception to FSM local parameters (`ST_`) all local parameters shall be prefixed with `LP_`.

**Guideline:** All module parameters (overridable at instantiation) shall be prefixed with `MP_`.

### 3.14 Bitwise Vs Logical Operators

**Guideline:** Bitwise operators shall only be used over bus signals.

**Guideline:** Logical operators shall be used over single bit values/signals.

- **Bitwise operators:** `&`, `|`, `~`, `^`
- **Logical operators:** `&&`, `||`, `!`, `^`

```verilog
wire       wsig_a ;
wire       wsig_b ;
wire       wresult;
wire [3:0] wbus_c;
wire [3:0] wbus_d;

// ...
assign wresult = wsig_a && (!wsig_b);
// ...
if (wsig_a || (!wsig_b)) begin
  // ...
end
// ...
assign wresult = wsig_a && (|(wbus_c & wbus_d));
// ...
if (&(wbus_c ^ wbus_d)) begin
  // ...
end
```

#### 3.14.1 Exceptions for Code Coverage

Verilog operators AND, OR have both Boolean (Bit-wise) and Logical versions. For code coverage purposes (condition), usage of Boolean or Logical operators in an expression with single-bit operands results in different coverage requirements.

| Operator Type | Symbols | Examples | Condition Coverage Requirement |
|---|---|---|---|
| Logical | `&&`, `\|\|` | `a && b`, `a \|\| b`, `(a \|\| b \|\| c)` | All possible combinations are evaluated for coverage. E.g. for `a && b`: `0 && 1`, `1 && 0`, `1 && 1` |
| Boolean / Bit-Wise | `&`, `\|` | `a & b`, `a \| b`, `\|(a,b,c)` – bitwise OR reduction | Only the true statement is evaluated for coverage. E.g. for `a & b`: `1 & 1` |

If Code Coverage analysis finds missing conditions in an expression, the following changes can be made in order of preference:

1. Evaluate the expression, find redundant operands, simplify if possible.
2. Improve the verification tests with normal functional usage of the IP. Do not create "dummy" tests just to reach code coverage.
3. **Exception to Coding Guideline:** Replace Logical operators with Boolean operators and perform a Logic Equivalence Check (LEC) with Formality tool.

### 3.15 Formatting of Numeric Operations

When performing operations with a signal that is a numeric representation, the following rules apply:

- Only use `'b` or `'h` when specification refers to a binary or hexadecimal value, respectively
- Always try to use local parameters or macros instead, when possible
- Can use `'b` for single bit buses
- On everything else, use `'d`
- Consider creating a local parameter or macro when the number does not represent a direct numeric value

---

