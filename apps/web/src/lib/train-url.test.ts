import { describe, expect, it } from 'vitest'
import { trainFromPath } from './train-url'

describe('trainFromPath', () => {
  it('reads the train number from either mode', () => {
    expect(trainFromPath('/stazioni/milano-centrale/partenze/9612')).toBe('9612')
    expect(trainFromPath('/stazioni/milano-centrale/arrivi/CB710/')).toBe('CB710')
  })

  it('is empty on a board and on anything else', () => {
    expect(trainFromPath('/stazioni/milano-centrale/partenze')).toBe('')
    expect(trainFromPath('/stazioni/milano-centrale')).toBe('')
    expect(trainFromPath('/')).toBe('')
  })

  it('decodes the number, and survives a malformed escape', () => {
    expect(trainFromPath('/stazioni/x/partenze/A%2F1')).toBe('A/1')
    expect(trainFromPath('/stazioni/x/partenze/%E0%A4%A')).toBe('%E0%A4%A')
  })
})
