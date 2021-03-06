var transitionMaxAmp = 0.00003 // 0.0001 is equivalent to 3200 rows

ashleyData = {
  // [[<filename>, <startRow>, <endRow>], ...]
  metadata: null,
  totalRows: null,

  initialize: function(done) {
    $.getJSON('data/slices_metadata.json', function(data) {
      ashleyData.metadata = data
      ashleyData.totalRows = data.slice(-1)[0][2] // row end of last row give total rows
      done()
    })
  },

  // `fromRow` must be smaller than `toRow`
  load: function(fromRow, toRow, done) {
    var self = this
    var length
    var fromDataSliceInd, toDataSliceInd
    var metadata, dataSlices = []

    // Find from metadata which slices we should fetch to include [`fromRow`, `toRow`]
    for (fromDataSliceInd = 0, length = this.metadata.length; fromDataSliceInd < length; fromDataSliceInd++) {
      if (this.metadata[fromDataSliceInd][1] <= fromRow && fromRow < this.metadata[fromDataSliceInd][2])
        break
    }
    for (toDataSliceInd = fromDataSliceInd, length = this.metadata.length; toDataSliceInd < length; toDataSliceInd++) {
      if (this.metadata[toDataSliceInd][1] <= toRow && toRow < this.metadata[toDataSliceInd][2])
        break
    }

    // Call recursively `_loadNext` to load all the slices
    metadata = this.metadata.slice(fromDataSliceInd, toDataSliceInd + 1)
    function _loadNext() {
      if (!metadata.length)
        return done(null, dataSlices)

      var dataSliceInfos = metadata.shift()
      var filename = dataSliceInfos[0]
      if (!self._cached[filename]) {
        console.log('ashleyData.load download ', filename)
        $.getJSON('/data/slices/' + filename, function(data) {
          self._cached[filename] = new DataSlice(data, dataSliceInfos[1], dataSliceInfos[2])
          dataSlices.push(self._cached[filename])
          _loadNext()
        })
      } else {
        dataSlices.push(self._cached[filename])
        _loadNext()
      }
    }

    _loadNext()
  },

  cleanCache: function() {
    var filename
    for(filename in this._cached) {
      var dataSlice = this._cached[filename]
      var found = false
      Card.cards.some(function(card) {
        if (card.rowIterator && card.rowIterator.dataSlices
          && card.rowIterator.dataSlices.indexOf(dataSlice) !== -1) {
          found = true
          return true
        }
      })
      if (found === false) {
        console.log('cleaned cache for ', filename)
        delete this._cached[filename]
      }
    }
  },

  _cached: {}
}


function DataSlice(data, rowMin, rowMax) {
  this.data = data
  this.rowMin = rowMin
  this.rowMax = rowMax
}

DataSlice.prototype.getRow = function(rowInd) {
  var row = this.data[rowInd - this.rowMin]
  if (!row) throw new Error('invalid row')
  return row
}


function RowIterator(startRow, endRow) {
  var self = this
  this.startRow = startRow
  this.endRow = endRow
  this.currentRow = startRow
  if (startRow < endRow)
    this.direction = 'asc'
  else
    this.direction = 'desc'
}

RowIterator.prototype.load = function(done) {
  var self = this
  var row1, row2
  if (this.direction === 'asc') {
    row1 = this.startRow
    row2 = this.endRow
  } else {
    row2 = this.startRow
    row1 = this.endRow
  }

  ashleyData.load(row1, row2, function(err, dataSlices) {
    if (err)
      return done(err)
    self.dataSlices = dataSlices
    if (self.direction === 'asc')
      self.dataSlicesInd = 0
    else
      self.dataSlicesInd = dataSlices.length - 1
    done()
  })
}

RowIterator.prototype.next = function() {
  if (this.currentRow === this.endRow) return null
  var dataSlice = this.dataSlices[this.dataSlicesInd]
  var row = dataSlice.getRow(this.currentRow)
  if (this.direction === 'asc') {
    this.currentRow++
    if (this.currentRow >= dataSlice.rowMax)
      this.dataSlicesInd++
  } else {
    this.currentRow--
    if (this.currentRow < dataSlice.rowMin)
      this.dataSlicesInd--
  }
  return row
}


function Card(el) {
  this.el = $(el)
  this.transitionEnd = +(new Date)
  Card.cards.push(this)
}
Card.cards = []

Card.prototype.transition = function(startRow, endRow, duration) {
  this.transitionEnd = +(new Date()) + duration + 5000 // allow some slack time
  var self = this

  this.rowIterator = new RowIterator(startRow, endRow)
  this.rowIterator.load(function(err) {
    if (err) return done(err)

    self.el.find('.row').remove()
    var row
    while(row = self.rowIterator.next())
      self.renderRow(row)

    self.el.scrollTop(0)
    self.el.animate({
      scrollTop: self.el.get(0).scrollHeight - self.el.height() - 50 // little padding so text fills-up all space
    }, duration, 'linear')

  })

}

Card.prototype.randomTransition = function() {
  var startRow
  if (!this.rowIterator)
    startRow = Math.floor(Math.random() * (ashleyData.totalRows * 1 - transitionMaxAmp))
  else
    startRow = this.rowIterator.endRow
  var sign = Math.random() > 0.5 ? -1 : 1
  var endRow = startRow + sign * (transitionMaxAmp * 0.05 + (transitionMaxAmp * 0.95) * Math.random()) * ashleyData.totalRows
  endRow = Math.round(endRow)
  this.transition(startRow, endRow, 20000)
}

// Instead, render all rows until next, and only then start transition
Card.prototype.renderRow = function(row) {
  var text = ' <b>' + row.slice(0, 4).filter(function(v) { return v && v.length }).join('') + '</b> '
    + row.slice(4).filter(function(v) { return v && v.length }).join(' ')
  var rowElem = $('<span class="row">' + text + '</span>')
  this.el.append(rowElem)
}

// Return true if card has a current transition, false otherwise
Card.prototype.inTransition = function() {
  return (+(new Date)) < this.transitionEnd // a little slack time
}


$(function() {

  function toGreyHex(num) {
    num = Math.round(num)
    var comp = num.toString(16)
    if (comp.length === 1)
      comp = '0' + comp
    return '#' + comp + comp + comp
  }

  var cardCount = $('.card').length
  /*$('.card').each(function(i, el) {
    $(el).css({
      'background-color': toGreyHex((i / cardCount) * 255),
      color: toGreyHex(255 - (i / cardCount) * 255)
    })
  })*/

  // Loop triggering transitions
  setInterval(function() {
    Card.cards.forEach(function(card) {
      if (!card.inTransition() && Math.random() > 0.995)
        card.randomTransition()
    })
  }, 600)

  // Loop cleaning unused data
  setInterval(function() {
    ashleyData.cleanCache()
  }, 5000)

  ashleyData.initialize(function(err) {
    console.log('initialized')
    $('.card').each(function(i, el) {
      var card = new Card(el)
      setTimeout(function() {
        card.randomTransition()
      }, Math.random() * 10000)
    })
  })
})
