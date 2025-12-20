declare namespace chrome.scripting {
  interface ScriptInjection {
    target: { tabId: number };
    func?: () => any;
  }

  function executeScript(injection: ScriptInjection): Promise<any[]>;
}