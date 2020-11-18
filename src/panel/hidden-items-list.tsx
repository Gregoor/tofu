import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import * as React from "react";

import { BareList, HiddenItemsProps, TextButton, humanize } from "./utils";

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }

  50% {
    transform:scale(1.5);
  }
`;

const PulseTextButton = styled(TextButton as any)`
  animation: ${pulse} 300ms ease-in-out infinite;
  animation-play-state: ${({ play }) => (play ? "running" : "paused")};
`;

export function HiddenItemsList({ hiddenItems, toggleItem }: HiddenItemsProps) {
  const [showList, setShowList] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setPulse(true);
  }, [hiddenItems]);

  const count = hiddenItems.size;
  if (count == 0) {
    return null;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        marginBottom: 10,
      }}
      onAnimationIteration={() => setPulse(false)}
    >
      <PulseTextButton
        onClick={() => setShowList(!showList)}
        style={{ width: "fit-content" }}
        play={pulse}
      >
        ...
      </PulseTextButton>
      {showList && (
        <>
          {count} item{count > 1 && "s"} hidden:
          <BareList>
            {Array.from(hiddenItems)
              .reverse()
              .map((name) => (
                <li key={name}>
                  <TextButton
                    onClick={() => {
                      if (count == 1) {
                        setShowList(false);
                      }
                      toggleItem(name);
                    }}
                  >
                    {humanize(name)}
                  </TextButton>
                </li>
              ))}
          </BareList>
        </>
      )}
    </div>
  );
}
