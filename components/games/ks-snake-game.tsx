"use client"

import { ArcadeGame, type ArcadeGameProps } from "./arcade-game"

export function KsSnakeGame(props: ArcadeGameProps) {
  return <ArcadeGame kind="snake" {...props} />
}
