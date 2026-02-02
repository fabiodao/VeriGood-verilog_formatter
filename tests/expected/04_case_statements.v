module test_cases;


// Test 1: Simple case statement - unformatted
always @(*) begin
  case (state)
    2'b00: output   = 0;
    2'b01: output   = 1;
    2'b10: output   = 2;
    default: output = 3;
  endcase
end

// Test 2: Case with begin/end blocks
always @(*) begin
  case (opcode)
    ADD: begin
      result   = a + b;
      overflow = carry;
    end
    SUB: begin
      result   = a - b ;
      overflow = borrow;
    end
    default: begin
      result   = 0;
      overflow = 0;
    end
  endcase
end

// Test 3: Nested case statements - unformatted
always @(*) begin
  case (mode)
    MODE_A: begin
      case (submode)
        SUB1: data = 1;
        SUB2: data = 2;
      endcase
    end
    MODE_B: data = 3;
  endcase
end

// Test 4: Case with comments
always @(*) begin
  case (state)
    IDLE:    next = WAIT; // Go to wait
    WAIT:    next = RUN ; // Start running
    RUN:     next = IDLE; // Return to idle
    default: next = IDLE;
  endcase
end

// Test 5: Case inside if statement
always @(*) begin
  if (enable) begin
    case (cmd)
      READ: data_out   = mem[addr];
      WRITE: mem[addr] = data_in  ;
    endcase
  end
end

// Test 6: Case with multiple statements per case - unformatted
always @(*) begin
  case (state)
    INIT: begin
      counter = 0;
      ready   = 0;
      done    = 0;
    end
    RUN: begin
      counter = counter+1;
      ready   = 1        ;
    end
    default: begin
      counter = 0;
      ready   = 0;
      done    = 1;
    end
  endcase
end

endmodule
