import React, { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import prettyBytes from "pretty-bytes";
import {
  Container,
  Row,
  Col,
  Alert,
  Card,
  CardBody,
  Button,
  Badge,
  Tooltip,
  CardHeader,
  FormInput,
  Collapse,
  CardFooter,
} from "shards-react";

var peer = new Peer();
var conn = peer.connect();

const App = () => {
  const [myID, setMyID] = useState("");
  const [friendID, setFriendID] = useState("");
  const [mystream, setsMytream] = useState();

  const [stateConnect, setStateConnect] = useState(false);
  const [stateButton, setSateButton] = useState(false);

  const [txtMessage, setTxtMessage] = useState();
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState();
  const [fileList, setFileList] = useState([]);

  let [stateTooltip, setStateTooltip] = useState(false);
  let [stateCopy, setStateCopy] = useState(false);
  let [stateDisConnect, setSateDisConnect] = useState(false);
  let [stateCollapseChat, setStateCollapseChat] = useState(false);
  let [stateCollapseFile, setStateCollapseFile] = useState(false);

  const [friendAudio, setFriendAudio] = useState(false);

  const myVideo = useRef();
  const friendVideo = useRef();

  // Set Title
  document.title = myID;

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setsMytream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      });

    peer.on("open", (id) => {
      setMyID(id);
    });

    peer.on("connection", (connection) => {
      conn = connection;
      // Receive Data
      connection.on("data", (data) => {
        setStateConnect(true);

        // setFriendID(data)
        if (data.type === "id") setFriendID(data.id);
        else if (data.type === "message") onReceivedMessage(data);
        else if (data.type === "file") onReceivedFile(data);
      });
    });

    peer.on("disconnect", () => {
      setStateConnect(false);
    });

    // Answer
    peer.on("call", (call) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          call.answer(stream);
          call.on("stream", (stream) => {
            friendVideo.current.srcObject = stream;
          });
        })
        .catch((err) => {
          console.error("Failed to get local stream", err);
        });
    });
  }, [setMessages]);

  const startConnection = () => {
    conn = peer.connect(friendID);

    // Send Friend ID
    conn.on("open", () => {
      conn.send({ type: "id", id: friendID });
      setStateConnect(true);
    });

    conn.on("data", (data) => {
      if (data.type === "message") onReceivedMessage(data);
      else if (data.type === "file") onReceivedFile(data);
    });

    peer.on("error", (err) => {
      if (err.type === "peer-unavailable")
        alert("The id or peer you're trying to connect to does not exist.");
      else if (err.type === "webrtc") {
        alert("Native WebRTC errors.");
        peer.destroy();
        window.location.reload(false);
      }
    });

    // Call
    let call = peer.call(friendID, mystream);
    call.on("stream", (stream) => {
      friendVideo.current.srcObject = stream;
    });
  };

  const onReceivedMessage = (data) => {
    setMessages((messages) => [
      ...messages,
      { message: data.message, owner: false },
    ]);
  };

  const onReceivedFile = (data) => {
    const blob = new Blob([data.file], { type: data.filetype });
    const url = URL.createObjectURL(blob);

    addFile({ name: data.filename, url: url, size: data.size });
  };

  const addFile = (file) => {
    const data = { name: file.name, url: file.url, size: file.size };
    setFileList((fileList) => [...fileList, data]);
  };

  // DisConnect Peer and Refresh Page
  const DisConnect = () => {
    peer.destroy();
    window.location.reload(false);
  };

  // My Video Conponent
  let MyVideo;
  if (mystream) {
    MyVideo = (
      <video
        playsInline
        muted
        ref={myVideo}
        autoPlay
        style={{ maxWidth: "100%" }}
      />
    );
  }

  // Friend Video Conponent
  let FriendVideo;
  if (friendVideo) {
    FriendVideo = (
      <video
        playsInline
        muted={friendAudio ? true : false}
        ref={friendVideo}
        autoPlay
        style={{ maxWidth: "100%" }}
      />
    );
  }

  const copyMyID = () => {
    setStateCopy(stateCopy ? false : true);
    navigator.clipboard.writeText(myID);
  };

  const togleStateDisConnect = () => {
    setSateDisConnect(stateDisConnect ? false : true);
  };

  const toggleCollapseChat = () => {
    setStateCollapseChat(stateCollapseChat ? false : true);
  };

  const toggleCollapseFile = () => {
    setStateCollapseFile(stateCollapseFile ? false : true);
  };

  const toggleTooltip = () => {
    setStateTooltip(stateTooltip ? false : true);
  };

  const handleChange = (e) => {
    setFriendID(e.target.value);
    if (e.target.value.length > 10) setSateButton(true);
    else setSateButton(false);
  };

  const sendMessage = () => {
    if (txtMessage) {
      conn.send({ type: "message", message: txtMessage });
      setMessages((messages) => [
        ...messages,
        { message: txtMessage, owner: true },
      ]);
      setTxtMessage("");
    }
    // console.log(txtMessage);
  };

  const sendFile = () => {
    const file = files[0];

    try {
      if (file.size >= 5242880) {
        const blob = new Blob(files, { type: file.type });

        conn.send({
          type: "file",
          file: blob,
          filename: file.name,
          filetype: file.type,
          size: file.size,
        });
      } else {
        alert("The file is less than 5 MB.");
      }
      setFiles("");
    } catch (err) {
      alert(err);
      setFiles("");
    }
  };

  const toggleFriendVoid = () => {
    setFriendAudio(friendAudio ? false : true);
  };

  return (
    <>
      <Container>
        <Row className="mt-2">
          <Col md="6">
            <Alert
              style={{
                marginBottom: "0"
              }}
            >
              My Video | Peer is {myID}
            </Alert>
            {MyVideo}
          </Col>

          <Col>
            <Alert
              theme="secondary"
              style={{
                marginBottom: "0",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>Friend Video {friendID ? `| Peer is ${friendID}` : ""}</div>
              <div>
                <i
                  style={{cursor:"pointer"}}
                  className={
                    friendAudio ? "bi bi-volume-mute-fill" : "bi bi-volume-up-fill"
                  }
                  onClick={toggleFriendVoid}
                ></i>
              </div>
            </Alert>
            {FriendVideo}
          </Col>
        </Row>

        {stateConnect ? (
          <>
            <Card>
              <CardHeader
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                }}
                onClick={toggleCollapseChat}
              >
                <div>
                  <b>Chat With Your Friend</b>
                </div>
                <div className="text-right">▼</div>
              </CardHeader>

              <Collapse open={stateCollapseChat}>
                <CardBody>
                  <Row>
                    {messages &&
                      messages.map((message, index) => (
                        <Col
                          md="12"
                          className={message.owner ? "text-right" : "text-left"}
                        >
                          <Button
                            outline
                            pill
                            theme={message.owner ? "primary" : "secondary"}
                            className="mb-1"
                          >
                            {" "}
                            {message.message}{" "}
                          </Button>
                        </Col>
                      ))}
                  </Row>
                </CardBody>
                <CardFooter>
                  <Row>
                    <Col md="9">
                      <FormInput
                        size="lg"
                        placeholder="Enter Message"
                        value={txtMessage}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendMessage();
                        }}
                        onChange={(e) => setTxtMessage(e.target.value)}
                      />
                    </Col>
                    <Col md="3" className="text-right">
                      <Button size="lg" onClick={sendMessage}>
                        Send Message
                      </Button>
                    </Col>
                  </Row>
                </CardFooter>
              </Collapse>
            </Card>

            <Card className="mt-2">
              <CardHeader
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                }}
                onClick={toggleCollapseFile}
              >
                <div>
                  <b>Sharing Files</b>
                </div>
                <div>▼</div>
              </CardHeader>

              <Collapse open={stateCollapseFile}>
                <CardBody>
                  {fileList &&
                    fileList.map((file, index) => (
                      <ul className="list-group" key={index}>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                          <a href={file.url} download={file.name}>
                            {file.name}
                          </a>
                          <span className="badge bg-primary rounded-pill">
                            {prettyBytes(file.size)}
                          </span>
                        </li>
                      </ul>
                    ))}
                </CardBody>
                <CardFooter>
                  <Row>
                    <Col md="9">
                      <FormInput
                        type="file"
                        size="lg"
                        onChange={(e) => setFiles(e.target.files)}
                      />
                    </Col>
                    <Col md="3" className="text-right">
                      <Button
                        size="lg"
                        disabled={files ? false : true}
                        onClick={sendFile}
                      >
                        Send File
                      </Button>
                    </Col>
                  </Row>
                </CardFooter>
              </Collapse>
            </Card>
          </>
        ) : (
          ""
        )}

        <Card className="mt-2 mb-2">
          <CardBody>
            {stateConnect ? (
              <>
                <Row>
                  <Col md="3">
                    {stateDisConnect ? (
                      <Badge
                        theme="danger"
                        onMouseLeave={togleStateDisConnect}
                        onClick={DisConnect}
                        style={{ cursor: "pointer" }}
                      >
                        <h4
                          style={{
                            marginBottom: "0",
                            padding: "10px",
                            color: "#FFF",
                          }}
                        >
                          DisConnect
                        </h4>
                      </Badge>
                    ) : (
                      <Badge
                        theme="success"
                        onMouseEnter={togleStateDisConnect}
                      >
                        <h4
                          style={{
                            marginBottom: "0",
                            padding: "10px",
                            color: "#FFF",
                          }}
                        >
                          Connected Peer ID
                        </h4>
                      </Badge>
                    )}
                  </Col>

                  <Col md="9">
                    <h4 style={{ margin: "0", padding: "10px" }}>{friendID}</h4>
                  </Col>
                </Row>
              </>
            ) : (
              <>
                <Row>
                  <Row>
                    <Col>
                      <h4>
                        <Badge className="mr-3" theme="info">
                          My ID
                        </Badge>
                        <label
                          style={{ cursor: "pointer" }}
                          id="myId"
                          onClick={copyMyID}
                        >
                          {myID}
                        </label>
                      </h4>
                      <Tooltip
                        open={stateTooltip}
                        toggle={toggleTooltip}
                        target="#myId"
                      >
                        {stateCopy ? "Copied" : "Clicke to Coppy"}
                      </Tooltip>
                    </Col>
                  </Row>

                  <Row>
                    <Col md="10">
                      <div className="form-floating mb-3">
                        <input
                          type="text"
                          className="form-control"
                          id="friendID"
                          placeholder="Enter Friend ID"
                          value={friendID}
                          onChange={(e) => handleChange(e)}
                        />
                        <label htmlFor="friendID">Enter Friend ID</label>
                      </div>
                    </Col>

                    <Col md="2">
                      <Button
                        size="lg"
                        pill
                        theme="success"
                        disabled={stateButton ? false : true}
                        onClick={startConnection}
                      >
                        Connect
                      </Button>
                    </Col>
                  </Row>
                </Row>
              </>
            )}
          </CardBody>
        </Card>
      </Container>
    </>
  );
};

export default App;
