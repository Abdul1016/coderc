import React, { useState, useRef } from 'react';

const CodeRunner = ({ code, language }) => {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  const supportedLanguages = ['javascript', 'js', 'html', 'css'];
  
  const isLanguageSupported = () => {
    return supportedLanguages.includes(language.toLowerCase());
  };

  const handleRunCode = () => {
    if (!isLanguageSupported()) {
      setError(`Running ${language} code is not supported in this editor.`);
      return;
    }

    setIsRunning(true);
    setOutput('');
    setError(null);

    try {
      if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js') {
        runJavaScript(code);
      } else if (language.toLowerCase() === 'html') {
        runHTML(code);
      } else if (language.toLowerCase() === 'css') {
        // We need HTML to run CSS, so we'll just show an info message
        setOutput('CSS needs HTML to display. Please use HTML mode to see CSS effects.');
      }
    } catch (err) {
      setError(`Runtime Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runJavaScript = (jsCode) => {
    // Create a sandbox to capture console.log outputs
    const originalConsoleLog = console.log;
    let outputLogs = [];
    
    console.log = (...args) => {
      originalConsoleLog(...args);
      outputLogs.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
    };

    try {
      // Use Function constructor to avoid scope issues and eval
      const result = Function(jsCode)();
      
      if (result !== undefined) {
        outputLogs.push(`Return value: ${
          typeof result === 'object' ? JSON.stringify(result, null, 2) : result
        }`);
      }

      setOutput(outputLogs.join('\n'));
    } catch (err) {
      setError(`Runtime Error: ${err.message}`);
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
    }
  };

  const runHTML = (htmlCode) => {
    if (iframeRef.current) {
      // Create a sandbox iframe for HTML rendering
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Clear the iframe content
      iframeDoc.open();
      iframeDoc.write(htmlCode);
      iframeDoc.close();
    }
  };

  return (
    <div className="code-runner mt-4 border border-gray-700 rounded-md overflow-hidden">
      <div className="flex justify-between items-center bg-gray-800 p-2">
        <h3 className="text-white font-medium">Code Output</h3>
        <button
          onClick={handleRunCode}
          disabled={isRunning || !isLanguageSupported()}
          className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
            isLanguageSupported() 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-600 text-gray-300 cursor-not-allowed'
          }`}
        >
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>
      
      <div className="output-area p-4 bg-gray-900 h-48 overflow-auto">
        {error ? (
          <div className="text-red-400 whitespace-pre-wrap font-mono text-sm">{error}</div>
        ) : language.toLowerCase() === 'html' ? (
          <iframe 
            ref={iframeRef} 
            title="HTML Output" 
            className="w-full h-full border-0"
            sandbox="allow-scripts"
          />
        ) : (
          <pre className="text-green-400 whitespace-pre-wrap font-mono text-sm">{output}</pre>
        )}
      </div>
    </div>
  );
};

export default CodeRunner;