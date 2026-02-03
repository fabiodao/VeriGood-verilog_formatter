module test_assignments;


// Test 1: Simple assignments - unaligned
assign a             = b+c         ;
assign data          = result      ;
assign output_signal = input_signal;

// Test 2: Blocking assignments - unaligned
always @(*) begin
  x = 1;
  y = 2;
  z = 3;
end

// Test 3: Non-blocking assignments - unaligned
always @(posedge clk) begin
  reg1               <= data1;
  reg2               <= data2;
  long_register_name <= short;
end

// Test 4: Mixed simple and complex expressions
assign a            = b                       ;
assign result       = ((a&b)|(c^d))           ;
assign out          = in                      ;

// Test 5: Multi-line assignments
assign large_result = {
                      data[31:24],
                      data[23:16],
                      data[15:8],
                      data[7:0]
                      };

// Test 6: Assignments with comments - unaligned
assign enable       = 1'b1                    ; // Enable signal
assign data         = 8'h00                   ; // Initial data
assign valid        = ready                   ; // Valid when ready

// Test 7: Conditional assignments
assign output       = enable ? data_in : 8'h00;
assign result       = (a > b) ? a : b         ;
assign mux_out      = sel ? in1 : in0         ;

endmodule
