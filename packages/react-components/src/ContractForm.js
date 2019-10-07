import { drizzleConnect } from "@drizzle/react-plugin";
import React, { Component } from "react";
import PropTypes from "prop-types";

const translateType = type => {
  switch (true) {
    case /^uint/.test(type):
      return "number";
    case /^string/.test(type) || /^bytes/.test(type):
      return "text";
    case /^bool/.test(type):
      return "checkbox";
    default:
      return "text";
  }
};

class ContractForm extends Component {
  constructor(props, context) {
    super(props);

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    this.contracts = context.drizzle.contracts;
    this.utils = context.drizzle.web3.utils;
    const { inputs, inputsState } = this.extractInputs();

    this.inputs = inputs;
    this.state = inputsState;
  }

  extractInputs() {
    // Get the contract ABI
    const abi = this.contracts[this.props.contract].abi;

    let inputs = [];
    let inputsState = {};

    // Iterate over abi for correct function.
    for (let i = 0; i < abi.length; i++) {
      if (abi[i].name === this.props.method) {
        inputs = abi[i].inputs;

        for (let j = 0; j < inputs.length; j++) {
          inputsState[inputs[j].name] = "";
        }

        break;
      }
    }

    return { inputs, inputsState };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.method !== this.props.method) {
      const { inputs, inputsState } = this.extractInputs();
      this.inputs = inputs;
      this.setState(inputsState);
    }
  }

  handleSubmit(event) {
    event.preventDefault();

    const convertedInputs = this.inputs.map(input => {
      if (input.type === "bytes32") {
        return this.utils.toHex(this.state[input.name]);
      }
      return this.state[input.name];
    });

    if (this.props.sendArgs) {
      return this.contracts[this.props.contract].methods[
        this.props.method
      ].cacheSend(...convertedInputs, this.props.sendArgs);
    }

    return this.contracts[this.props.contract].methods[
      this.props.method
    ].cacheSend(...convertedInputs);
  }

  handleInputChange(event) {
    const value =
      event.target.type === 'checkbox'
        ? event.target.checked
        : event.target.value;
    this.setState({ [event.target.name]: value });
  }

  render() {
    if (this.props.render) {
      return this.props.render({
        inputs: this.inputs,
        inputTypes: this.inputs.map(input => translateType(input.type)),
        state: this.state,
        handleInputChange: this.handleInputChange,
        handleSubmit: this.handleSubmit,
      });
    }

    return (
      <form
        className="pure-form pure-form-stacked"
        onSubmit={this.handleSubmit}
      >
        {this.inputs.map((input, index) => {
          var inputType = translateType(input.type);
          var inputLabel = this.props.labels
            ? this.props.labels[index]
            : input.name;
          // check if input type is struct and if so loop out struct fields as well
          return (
            <input
              key={input.name}
              type={inputType}
              name={input.name}
              value={this.state[input.name]}
              placeholder={inputLabel}
              onChange={this.handleInputChange}
            />
          );
        })}
        <button
          key="submit"
          className="pure-button"
          type="button"
          onClick={this.handleSubmit}
        >
          Submit
        </button>
      </form>
    );
  }
}

ContractForm.contextTypes = {
  drizzle: PropTypes.object,
};

ContractForm.propTypes = {
  contract: PropTypes.string.isRequired,
  method: PropTypes.string.isRequired,
  sendArgs: PropTypes.object,
  labels: PropTypes.arrayOf(PropTypes.string),
  render: PropTypes.func,
};

/*
 * Export connected component.
 */

const mapStateToProps = state => {
  return {
    contracts: state.contracts,
  };
};

export default drizzleConnect(ContractForm, mapStateToProps);
