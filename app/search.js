const React = require('react')
const ReactAutocomplete = require('react-autocomplete')
const normalizeForSearch = require('normalize-for-search')

module.exports = class Search extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      value: ''
    }
  }

  render () {
    const {
      items = [],
      onSearch = () => {}
    } = this.props

    return (
      <ReactAutocomplete
        inputProps={{
          placeholder: 'Search Datpedia',
          autoFocus: true
        }}
        inputProps={{
          style: {
            borderRadius: '10px',
            borderColor: 'black',
            borderSize: 3,
            placeholder: true,
            fontSize: 22,
            fontFamily: 'sans-serif'
          }
        }}
        menuStyle={{
          borderRadius: '3px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '0',
          position: 'fixed',
          overflow: 'auto',
          maxHeight: '50%', // TODO: don't cheat, let it flow to the bottom
        }}
        items={items}
        shouldItemRender={(item, value) => {
          return value.length !== 0 &&
            item.searchName.indexOf(normalizeForSearch(value)) > -1
        }}
        getItemValue={item => item.name}
        renderItem={(item, highlighted) =>
          <div
            className='searchItem'
            key={item.name}
            style={{ backgroundColor: highlighted ? '#eee' : 'transparent'}}
          >
            {item.name}
          </div>
        }
        value={this.state.value}
        onChange={e => this.setState({ value: e.target.value })}
        onSelect={(value, item) => {
          this.setState({ value })
          onSearch(item)
        }}
      />
    )
  }
}