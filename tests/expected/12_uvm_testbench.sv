// Test UVM testbench formatting with comprehensive structures

`ifndef MY_UVM_TEST_SV
`define MY_UVM_TEST_SV

//--------------------------------------------------------------------------
// Test configuration class with constraints and pre_randomize
//--------------------------------------------------------------------------
class my_test_config extends uvm_object;
  `uvm_object_utils(my_test_config)

  // Configuration parameters
  int max_lane_count;
  int link_rate;
  bit enable_feature_a;
  bit enable_feature_b;
  rand int packet_size;
  rand int num_packets;

  function new(string name="my_test_config");
    super.new(name);
  endfunction : new

  // Pre-randomize to set up constraints
  function void pre_randomize();
    `uvm_info("my_test_config", "Running pre-randomize", UVM_LOW)
    super.pre_randomize();
    max_lane_count   = 4   ;
    link_rate        = 5400;
    enable_feature_a = 1   ;
    enable_feature_b = 0   ;
  endfunction : pre_randomize

  // Constraints for random variables
  constraint valid_packet_size_ct {
    packet_size >= 64  ;
    packet_size <= 1500;
  }

  constraint num_packets_ct {
    num_packets >= 10 ;
    num_packets <= 100;
  }

  constraint feature_dependency_ct {
    enable_feature_a == 1;
    enable_feature_b == 0;
  }

endclass : my_test_config

//--------------------------------------------------------------------------
// Driver class with UVM macros and phase methods
//--------------------------------------------------------------------------
class my_driver extends uvm_driver #(my_transaction);
  `uvm_component_utils(my_driver)

  virtual my_if vif;
  int transaction_count;
  bit debug_mode;

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction : new

  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    if(!uvm_config_db#(virtual my_if)::get(this, "", "vif", vif))
    `uvm_fatal("NO_VIF", "Virtual interface not found")
    transaction_count = 0;
    debug_mode        = 0;
  endfunction : build_phase

  function void connect_phase(uvm_phase phase);
    super.connect_phase(phase);
    `uvm_info(get_type_name(), "Connect phase completed", UVM_MEDIUM)
  endfunction : connect_phase

  task run_phase(uvm_phase phase);
    forever begin
      seq_item_port.get_next_item(req);
      drive_transaction(req);
      seq_item_port.item_done();
      transaction_count = transaction_count+1;
    end
  endtask : run_phase

  task drive_transaction(my_transaction tr);
    if(tr.valid==1) begin
      vif.data  <= tr.data;
      vif.addr  <= tr.addr;
      vif.valid <= 1'b1   ;
    end else begin
      vif.data  <= 0   ;
      vif.addr  <= 0   ;
      vif.valid <= 1'b0;
    end
    @(posedge vif.clk);
  endtask : drive_transaction

  function void report_phase(uvm_phase phase);
    super.report_phase(phase);
    `uvm_info(get_type_name(), $sformatf("Completed %0d transactions", transaction_count), UVM_LOW)
  endfunction : report_phase

endclass : my_driver

//--------------------------------------------------------------------------
// Monitor class
//--------------------------------------------------------------------------
class my_monitor extends uvm_monitor;
  `uvm_component_utils(my_monitor)

  virtual my_if vif;
  uvm_analysis_port #(my_transaction) analysis_port;

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction : new

  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    analysis_port = new("analysis_port", this);
    if(!uvm_config_db#(virtual my_if)::get(this, "", "vif", vif))
    `uvm_error("NO_VIF", "Virtual interface not found")
  endfunction : build_phase

  task run_phase(uvm_phase phase);
    my_transaction tr;
    forever begin
      @(posedge vif.clk);
      if(vif.valid) begin
        tr       = my_transaction::type_id::create("tr");
        tr.data  = vif.data                             ;
        tr.addr  = vif.addr                             ;
        tr.valid = vif.valid                            ;
        analysis_port.write(tr);
      end
    end
  endtask : run_phase

endclass : my_monitor

//--------------------------------------------------------------------------
// Test class with type overrides
//--------------------------------------------------------------------------
class my_test extends uvm_test;
  `uvm_component_utils(my_test)

  my_env env;
  my_test_config cfg;

  function new(string name="my_test", uvm_component parent=null);
    super.new(name, parent);
  endfunction : new

  function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    set_type_override_by_type(my_transaction::get_type(), extended_transaction::get_type());
    cfg = my_test_config::type_id::create("cfg");
    env = my_env::type_id::create("env", this)  ;
    uvm_config_db#(my_test_config)::set(this, "*", "config", cfg);
  endfunction : build_phase

  function void end_of_elaboration_phase(uvm_phase phase);
    super.end_of_elaboration_phase(phase);
    `uvm_info(get_type_name(), "Topology:", UVM_LOW)
    print();
  endfunction : end_of_elaboration_phase

  task run_phase(uvm_phase phase);
    my_sequence seq;
    phase.raise_objection(this);
    seq = my_sequence::type_id::create("seq");
    seq.randomize();
    seq.start(env.agent.sequencer);
    #1000;
    phase.drop_objection(this);
  endtask : run_phase

  function void report_phase(uvm_phase phase);
    super.report_phase(phase);
    `uvm_info(get_type_name(), "Test completed successfully", UVM_LOW)
  endfunction : report_phase

endclass : my_test

`endif

