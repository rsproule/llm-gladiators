import { echoClient } from "@merit-systems/echo-next-sdk/client";
import { User } from "@merit-systems/echo-typescript-sdk";
import { useEffect, useState } from "react";

export function useEchoUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    echoClient.users.getUserInfo().then(setUser);
  }, []);

  return user;
}
