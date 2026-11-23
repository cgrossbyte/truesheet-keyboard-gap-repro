import { TrueSheet } from '@lodev09/react-native-true-sheet'
import type { ComponentRef } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

/** Lets the keyboard and the sheet settle before measuring. */
const SETTLE_DELAY_MS = 700

interface Measurement {
  inputBottom: number
  footerTop: number
}

interface Measurable {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void
}

function measureFrame(view: Measurable | null): Promise<{ top: number; bottom: number } | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null)
    view.measureInWindow((_x, y, _width, height) => resolve({ top: y, bottom: y + height }))
  })
}

export default function App() {
  const sheet = useRef<TrueSheet>(null)
  const scrollable = useRef<ComponentRef<typeof ScrollView>>(null)
  const input = useRef<ComponentRef<typeof TextInput>>(null)
  const footer = useRef<ComponentRef<typeof View>>(null)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [closed, setClosed] = useState<Measurement | null>(null)
  const [open, setOpen] = useState<Measurement | null>(null)

  async function measure(target: 'closed' | 'open') {
    const [inputFrame, footerFrame] = await Promise.all([measureFrame(input.current), measureFrame(footer.current)])
    if (!inputFrame || !footerFrame) return
    const measurement = { inputBottom: inputFrame.bottom, footerTop: footerFrame.top }
    if (target === 'open') setOpen(measurement)
    else setClosed(measurement)
  }

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardOpen(true)
      setTimeout(() => measure('open'), SETTLE_DELAY_MS)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardOpen(false)
      setTimeout(() => measure('closed'), SETTLE_DELAY_MS)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return (
    <View style={styles.screen}>
      <Button title="Open sheet" onPress={() => sheet.current?.present()} />

      <TrueSheet
        ref={sheet}
        detents={['auto']}
        scrollableRef={scrollable}
        backgroundColor="#ffffff"
        footerStyle={styles.footerSurface}
        footerOptions={{ position: 'absolute' }}
        onDidPresent={() => setTimeout(() => measure('closed'), SETTLE_DELAY_MS)}
        footer={
          <View ref={footer} style={styles.footer}>
            <View style={styles.footerButton}>
              <Text style={styles.footerButtonLabel}>Footer</Text>
            </View>
          </View>
        }
      >
        <ScrollView ref={scrollable} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Auto sheet · scrollable · absolute footer</Text>
          <Readout label="Keyboard closed" measurement={closed} />
          <Readout label="Keyboard open" measurement={open} />
          <Text style={styles.hint}>
            {isKeyboardOpen ? 'Keyboard is open.' : 'Focus the input to open the keyboard.'} The gap is the distance between
            the input's bottom edge and the footer's top edge.
          </Text>
          <TextInput ref={input} style={styles.input} placeholder="Amount" keyboardType="decimal-pad" />
        </ScrollView>
      </TrueSheet>
    </View>
  )
}

function Readout({ label, measurement }: { label: string; measurement: Measurement | null }) {
  const gap = measurement ? (measurement.footerTop - measurement.inputBottom).toFixed(1) : '–'
  return (
    <Text style={styles.readout}>
      {label}: gap {gap} pt
      {measurement ? `  (input bottom ${measurement.inputBottom.toFixed(1)}, footer top ${measurement.footerTop.toFixed(1)})` : ''}
    </Text>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9e6dc' },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8, gap: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  readout: { fontSize: 13, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 13, color: '#666666' },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#f1ede1', fontSize: 16 },
  footerSurface: { backgroundColor: '#ffffff' },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  footerButton: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#b8e04e' },
  footerButtonLabel: { fontSize: 16, fontWeight: '700' },
})
