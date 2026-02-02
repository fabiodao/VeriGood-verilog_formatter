module test_declarations;


// Test 1: Wire declarations - unaligned semicolons
wire        a            ;
wire  [7:0] data         ;
wire [31:0] long_data_bus;
wire        clk          ;

// Test 2: Reg declarations - unaligned semicolons
reg         valid        ;
reg  [15:0] counter      ;
reg   [7:0] state        ;
reg         done         ;

// Test 3: Mixed wire declarations with initialization - unaligned
wire       enable = 1'b1;
wire [3:0] select = 4'h0;
wire       ready  = 1'b0;

// Test 4: Multi-bit declarations - unaligned
wire [31:0] addr                     ;
wire [63:0] data_wide                ;
wire  [7:0] byte_val                 ;
wire        single                   ;

// Test 5: Declarations with comments - unaligned
wire        clk                      ; // Clock signal
wire        rst_n                    ; // Active low reset
wire  [7:0] data_bus                 ; // 8-bit data
wire        valid                    ; // Valid flag

// Test 6: Multiple declarations on one line
wire        a, b, c                  ;
reg   [7:0] x, y, z                  ;

// Test 7: Signed declarations
wire        signed [15:0] signed_data;
reg         signed [7:0] signed_reg  ;

// Test 8: Declarations with packed and unpacked dimensions
wire  [7:0] mem [0:255]              ;
reg  [31:0] registers [0:15]         ;

endmodule
