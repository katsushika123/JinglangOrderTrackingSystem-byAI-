import { useState, useEffect, useCallback } from 'react'
import type { BatchRow } from '../types'
import * as ipc from '../ipc'

export function useBatches() {
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    window.electronAPI?.onDbReady(() => setDbReady(true))
  }, [])

  const fetchBatches = useCallback(async () => {
    try {
      const data = await ipc.getBatches()
      setBatches(data)
    } catch (err) {
      console.error('获取清单失败:', err)
    }
  }, [])

  useEffect(() => {
    if (dbReady) fetchBatches()
  }, [fetchBatches, dbReady])

  return { batches, refreshBatches: fetchBatches }
}
