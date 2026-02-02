module test_edge_cases;


// Test 1: Preserve block comments
/* This is a
   multi-line
   block comment */
wire data        ;

// Test 2: Ifdef with annotation
`ifdef DEBUG
wire debug_signal;
`endif // DEBUG

// Test 3: Multiple blank lines (should compress to maxBlankLines)

wire after_blanks;

// Test 4: Trailing whitespace (should be removed)
wire trailing    ;

// Test 5: Complex nested structure
always @(posedge clk) begin
  if (enable) begin
    case (mode)
      0: begin
        if (sub_enable) begin
          data    <= 1;
        end
      end
      1: begin
        data    <= 2;
      end
    endcase
  end
end

// Test 6: Mixed tabs and spaces (should normalize)
	wire tabbed;
  wire spaced;

// Test 7: Inline comments preservation
assign a = b; // inline comment
assign c = d; // another comment

// Test 8: Empty always block
always @(*) begin
end

// Test 9: Single-line if without begin/end (should add)
always @(*)
if (a)
  b               = c                                                ;

// Test 10: Complex bit manipulations
assign result   = {data[31:24], data[23:16], data[15:8], data[7:0]};
assign swapped  = {data[7:0], data[15:8]}                          ;

// Test 11: Replication and concatenation
assign repeated = {8{1'b0}}                                        ;
assign combined = {4'hF, repeated}                                 ;

// Test 12: Nested concatenation with replication - unformatted
assign complex  = {2{a,b}},{4{c}},d                                ;

endmodule
