--
-- PostgreSQL database dump
--

-- Dumped from database version 13.21
-- Dumped by pg_dump version 17.5

-- Started on 2025-08-11 16:58:12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 2 (class 3079 OID 16384)
-- Name: adminpack; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS adminpack WITH SCHEMA pg_catalog;


--
-- TOC entry 3155 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION adminpack; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION adminpack IS 'administrative functions for PostgreSQL';


--
-- TOC entry 3 (class 3079 OID 16583)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3156 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 216 (class 1255 OID 16674)
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

--
-- TOC entry 264 (class 1255 OID 16574)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 211 (class 1259 OID 16789)
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    customer_name character varying(100) NOT NULL,
    mobile_number character varying(15) NOT NULL,
    property_requirement character varying(10) NOT NULL,
    customer_photo text,
    assigned_employee_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    company_id character varying(255),
    property_name text,
    facing text,
    property_size text,
    total_floors integer,
    price numeric,
    location text,
    street_landmark text,
    map text,
    rent_lease numeric,
    deposit numeric,
    maintenance numeric,
    available_from date,
    parking text,
    preferred_tenants text,
    non_veg_allowed boolean DEFAULT false,
    CONSTRAINT appointments_property_requirement_check CHECK (((property_requirement)::text = ANY ((ARRAY['1RK'::character varying, '1BHK'::character varying, '2BHK'::character varying, '3BHK'::character varying])::text[])))
);


ALTER TABLE public.appointments OWNER TO postgres;

--
-- TOC entry 210 (class 1259 OID 16787)
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO postgres;

--
-- TOC entry 3157 (class 0 OID 0)
-- Dependencies: 210
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- TOC entry 209 (class 1259 OID 16693)
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    dob date NOT NULL,
    address text NOT NULL,
    photo character varying(255),
    aadhaar_card character varying(255),
    pan_card character varying(255),
    joining_date date NOT NULL,
    status character varying(50) NOT NULL,
    email_id character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_id uuid
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- TOC entry 208 (class 1259 OID 16691)
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- TOC entry 3158 (class 0 OID 0)
-- Dependencies: 208
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- TOC entry 205 (class 1259 OID 16541)
-- Name: grouped_listings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grouped_listings (
    id integer NOT NULL,
    user_id integer,
    name text,
    price text,
    description text,
    images text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.grouped_listings OWNER TO postgres;

--
-- TOC entry 204 (class 1259 OID 16539)
-- Name: grouped_listings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grouped_listings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grouped_listings_id_seq OWNER TO postgres;

--
-- TOC entry 3159 (class 0 OID 0)
-- Dependencies: 204
-- Name: grouped_listings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grouped_listings_id_seq OWNED BY public.grouped_listings.id;


--
-- TOC entry 207 (class 1259 OID 16558)
-- Name: listings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.listings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    price numeric NOT NULL,
    images text[] NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    city character varying(100),
    property_type character varying(50),
    bhk character varying(20),
    facing character varying(20),
    size character varying(50),
    floors character varying(20),
    total_floors character varying(20),
    location character varying(200),
    street_landmark character varying(200),
    map_link text,
    rent_or_lease character varying(50),
    deposit character varying(50),
    maintenance character varying(50),
    available_from date,
    furnishing character varying(50),
    parking character varying(100),
    preferred_tenants character varying(100),
    non_veg_allowed boolean DEFAULT false,
    shown_by character varying(100),
    booking_date date,
    agreement_duration character varying(50),
    bookingstatus character varying(50) DEFAULT 'booked'::character varying,
    transaction_image character varying(255),
    mode_of_payment character varying(50),
    bookedby character varying(255),
    booking_status character varying(20) DEFAULT 'available'::character varying,
    booked_by integer,
    rent_status character varying(20) DEFAULT 'pending'::character varying,
    updated_on timestamp without time zone,
    updated_by integer,
    company_id integer,
    customer_photo text
);


ALTER TABLE public.listings OWNER TO postgres;

--
-- TOC entry 206 (class 1259 OID 16556)
-- Name: listings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.listings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.listings_id_seq OWNER TO postgres;

--
-- TOC entry 3160 (class 0 OID 0)
-- Dependencies: 206
-- Name: listings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.listings_id_seq OWNED BY public.listings.id;


--
-- TOC entry 213 (class 1259 OID 25069)
-- Name: property_photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_photos (
    id integer NOT NULL,
    appointment_id integer,
    photo_path text
);


ALTER TABLE public.property_photos OWNER TO postgres;

--
-- TOC entry 212 (class 1259 OID 25067)
-- Name: property_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.property_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.property_photos_id_seq OWNER TO postgres;

--
-- TOC entry 3161 (class 0 OID 0)
-- Dependencies: 212
-- Name: property_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.property_photos_id_seq OWNED BY public.property_photos.id;


--
-- TOC entry 215 (class 1259 OID 25097)
-- Name: rent_collections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rent_collections (
    id integer NOT NULL,
    listing_id integer NOT NULL,
    user_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_screenshot character varying(255),
    collection_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) DEFAULT 'completed'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rent_collections_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'online'::character varying])::text[]))),
    CONSTRAINT rent_collections_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.rent_collections OWNER TO postgres;

--
-- TOC entry 214 (class 1259 OID 25095)
-- Name: rent_collections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rent_collections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rent_collections_id_seq OWNER TO postgres;

--
-- TOC entry 3162 (class 0 OID 0)
-- Dependencies: 214
-- Name: rent_collections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rent_collections_id_seq OWNED BY public.rent_collections.id;


--
-- TOC entry 203 (class 1259 OID 16455)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100),
    email character varying(100),
    password character varying(255),
    user_type integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid DEFAULT gen_random_uuid(),
    is_active boolean DEFAULT true
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 202 (class 1259 OID 16453)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 3163 (class 0 OID 0)
-- Dependencies: 202
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 2951 (class 2604 OID 16792)
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- TOC entry 2948 (class 2604 OID 16696)
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- TOC entry 2938 (class 2604 OID 16544)
-- Name: grouped_listings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grouped_listings ALTER COLUMN id SET DEFAULT nextval('public.grouped_listings_id_seq'::regclass);


--
-- TOC entry 2941 (class 2604 OID 16561)
-- Name: listings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listings ALTER COLUMN id SET DEFAULT nextval('public.listings_id_seq'::regclass);


--
-- TOC entry 2955 (class 2604 OID 25072)
-- Name: property_photos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_photos ALTER COLUMN id SET DEFAULT nextval('public.property_photos_id_seq'::regclass);


--
-- TOC entry 2956 (class 2604 OID 25100)
-- Name: rent_collections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_collections ALTER COLUMN id SET DEFAULT nextval('public.rent_collections_id_seq'::regclass);


--
-- TOC entry 2932 (class 2604 OID 16458)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3144 (class 0 OID 16789)
-- Dependencies: 211
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointments (id, customer_name, mobile_number, property_requirement, customer_photo, assigned_employee_id, created_at, is_active, company_id, property_name, facing, property_size, total_floors, price, location, street_landmark, map, rent_lease, deposit, maintenance, available_from, parking, preferred_tenants, non_veg_allowed) FROM stdin;
8	snehas	5264220258	1BHK	\N	2	2025-07-29 15:16:56.701445	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
6	sneha	1234567890	2BHK	\N	2	2025-07-29 12:00:16.329348	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
7	asdd	5264220258	2BHK	\N	2	2025-07-29 12:18:54.801798	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
12	das	45065989606	1BHK	\N	2	2025-07-29 19:36:12.08758	f	3a2182e8-4b1b-4d20-9d55-460ac34260c6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
9	daeda	5264220258	1BHK	photo-1753782441827.png	2	2025-07-29 15:17:21.882794	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
18	Saksham	9589726600	2BHK	\N	2	2025-07-31 20:03:57.379889	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
13	das	9589726600	1BHK	\N	2	2025-07-29 19:36:37.037396	f	3a2182e8-4b1b-4d20-9d55-460ac34260c6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
21	harsh	5489979389	1BHK	\N	2	2025-08-02 13:39:38.464726	f	3a2182e8-4b1b-4d20-9d55-460ac34260c6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
17	Saksham	9589726600	2BHK	\N	2	2025-07-31 20:03:52.474464	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
19	Saksham	9589726600	2BHK	\N	2	2025-08-02 13:12:53.080547	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
10	daeda	5264220258	1BHK	photo-1753782450369.png	2	2025-07-29 15:17:30.383564	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
11	dfe	1541006840	2BHK	\N	2	2025-07-29 15:28:14.121223	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
14	Sakshi	9589726600	1BHK	\N	2	2025-07-29 19:42:45.520865	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
15	Sakshi	958752620	1BHK	\N	2	2025-07-29 19:43:17.479444	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
16	aefe	665205054	1BHK	\N	2	2025-07-30 12:42:25.535813	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
23	Saksham Tiwari	9589726600	2BHK	\N	\N	2025-08-04 12:16:34.169203	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
24	fsdf	sefgwe	1BHK	\N	\N	2025-08-04 12:27:47.601653	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
25	fewe	45065989606	1BHK	1754292823939_women.png	2	2025-08-04 13:03:43.984483	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
26	daf	958752620	1BHK	1754293112186_w.png	2	2025-08-04 13:08:32.215013	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
22	Saksham	958726052	1BHK	\N	2	2025-08-02 13:58:04.258504	f	3a2182e8-4b1b-4d20-9d55-460ac34260c6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
20	Saksham	9589726600	2BHK	\N	2	2025-08-02 13:37:30.17993	f	3a2182e8-4b1b-4d20-9d55-460ac34260c6	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
27	Sakshi	9589726600	1BHK	1754294582732_woman.png	2	2025-08-04 13:33:02.75632	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
28	Shruti	9589726500	2BHK	uploads\\1754544917176_w.png	3	2025-08-07 11:05:17.222965	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f
\.


--
-- TOC entry 3142 (class 0 OID 16693)
-- Dependencies: 209
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, name, dob, address, photo, aadhaar_card, pan_card, joining_date, status, email_id, created_at, updated_at, company_id) FROM stdin;
2	John Doe	1990-01-01	123 Main St	johndoe.jpg	AADHAAR1234	PAN1234	2024-01-01	active	john@example.com	2025-07-29 11:23:40.660995	2025-07-29 11:23:40.660995	\N
3	Saksham Tiwari	2001-08-08	410/A4 Canal Kinship Salaiya	\N	\N	\N	2025-07-31	active	abcde@gmail.com	2025-08-07 10:13:05.613015	2025-08-07 10:13:05.613015	\N
\.


--
-- TOC entry 3138 (class 0 OID 16541)
-- Dependencies: 205
-- Data for Name: grouped_listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.grouped_listings (id, user_id, name, price, description, images, created_at, updated_at) FROM stdin;
1	6	\N	\N	\N	{1753103309329-53350394.png,1753103309337-535464148.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
2	6	\N	\N	\N	{1753103404960-171796642.png,1753103404969-725296510.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
3	6	\N	\N	\N	{1753103498505-511297353.png,1753103498515-333920053.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
4	6	\N	\N	\N	{1753103544380-748965312.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
5	6	\N	\N	\N	{1753103675943-103978507.png,1753103675948-414771892.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
6	6	\N	\N	\N	{1753103809274-494709141.png,1753103809280-835231037.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
7	6	\N	\N	\N	{1753103880073-569851068.png,1753103880080-876414852.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
8	6	\N	\N	\N	{1753103918469-77807353.png,1753103918473-590386914.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
9	6	\N	\N	\N	{1753104163862-415089599.png,1753104163867-519624885.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
10	6	\N	\N	\N	{1753104593781-227032046.png,1753104593785-720794800.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
11	6	\N	\N	\N	{1753178017854-936331727.png,1753178017862-879644430.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
12	6	\N	\N	\N	{1753178322875-560500325.png,1753178322885-544688570.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
13	6	\N	\N	\N	{1753178398379-545608707.png,1753178398398-56761152.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
14	6	\N	\N	\N	{1753178999778-207563959.png,1753178999796-660056660.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
15	6	\N	\N	\N	{1753179577751-844767841.png,1753179577766-816315845.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
16	6	\N	\N	\N	{1753179617235-815460544.png,1753179617253-454469735.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
17	6	\N	\N	\N	{1753205506665-548906774.png,1753205506677-495874296.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
18	6	\N	\N	\N	{1753205544597-281731931.png,1753205544617-441722784.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
19	6	\N	\N	\N	{1753334073902-479211856.png,1753334073917-461481151.png}	2025-07-29 19:18:06.10799	2025-07-29 19:18:06.10799
\.


--
-- TOC entry 3140 (class 0 OID 16558)
-- Dependencies: 207
-- Data for Name: listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.listings (id, user_id, name, price, images, created_at, updated_at, description, city, property_type, bhk, facing, size, floors, total_floors, location, street_landmark, map_link, rent_or_lease, deposit, maintenance, available_from, furnishing, parking, preferred_tenants, non_veg_allowed, shown_by, booking_date, agreement_duration, bookingstatus, transaction_image, mode_of_payment, bookedby, booking_status, booked_by, rent_status, updated_on, updated_by, company_id, customer_photo) FROM stdin;
1	7	sd	500	{1753274896347-488094178.png}	2025-07-23 18:18:16.354338	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
2	7	watches	500	{1753274914148-145567118.png,1753274914154-670280331.png}	2025-07-23 18:18:34.184195	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
4	6	dw	600	{1753334059418-459148020.png}	2025-07-24 10:44:19.456931	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
5	6	watches	6000	{1753334238022-132893703.png,1753334238028-687838899.png}	2025-07-24 10:47:18.06605	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
3	7	Electronics	8000	{1753338379812-17156216.png,1753338379821-645424148.png}	2025-07-23 18:20:21.538989	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
6	7	T-shirt	500	{1753338415577-963174265.png}	2025-07-24 11:56:55.641225	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
7	6	dajk	500	{1753342857661-713594769.png}	2025-07-24 13:10:57.703335	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
8	7	ddn	4000	{1753423520284-633466819.png,1753423520292-402448804.png,1753423520299-846379294.png,1753423520309-952047264.png,1753423520316-782916533.png}	2025-07-25 11:35:20.355962	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
9	7	Things	5000	{1753423599178-847454552.png,1753423599183-662923647.png,1753423599188-40510116.png,1753423599196-913993751.png,1753423599203-383209408.png}	2025-07-25 11:36:39.357556	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
10	7	dad	6000	{1753429412826-855119619.png,1753429412835-534439633.png,1753429412843-772243093.png,1753429412854-129678419.png,1753429412862-661772168.png}	2025-07-25 13:13:32.910854	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
11	7	da	600	{1753429474460-907881662.png,1753429474464-41769778.png,1753429474469-766060013.png,1753429474474-64747079.png,1753429474481-797890913.png}	2025-07-25 13:14:34.488501	2025-07-26 13:50:21.508928+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
23	6	das	400	{1754376877997-468355674.png}	2025-08-05 12:24:38.044927	2025-08-05 12:24:38.044927+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
24	6	dasd	400	{1754376898871-687183163.png}	2025-08-05 12:24:58.912412	2025-08-05 12:24:58.912412+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
25	6	harsh	500	{1754376952611-816967253.png}	2025-08-05 12:25:52.664567	2025-08-05 12:25:52.664567+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
26	6	ded	500	{1754377574400-389891042.png,1754377574406-329766023.png}	2025-08-05 12:36:14.45105	2025-08-05 12:36:14.45105+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
27	6	Watch	500	{1754382937400-938512124.png,1754382937414-61298350.png}	2025-08-05 14:05:37.471057	2025-08-06 14:48:02.919254+05:30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
29	6	Saksham	500	{1754383714820-125879428.png}	2025-08-05 14:18:34.887036	2025-08-07 18:44:04.084611+05:30		\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
28	6	Watches	500	{1754383536061-16263004.png}	2025-08-05 14:15:36.115828	2025-08-07 18:44:04.084611+05:30		\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	booked	\N	\N	\N	available	\N	pending	\N	\N	\N	\N
30	6	Pragya	500	{1754384800674-903948875.png}	2025-08-05 14:36:40.824744	2025-08-08 12:57:12.634061+05:30					\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	booked	\N	\N	\N	booked	\N	pending	\N	\N	\N	\N
31	6	Shirts	800	{1754565497628-556214689.png}	2025-08-07 16:48:17.679386	2025-08-11 14:40:18.02446+05:30					\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	booked	\N	\N	\N	booked	\N	paid	\N	\N	\N	\N
\.


--
-- TOC entry 3146 (class 0 OID 25069)
-- Dependencies: 213
-- Data for Name: property_photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_photos (id, appointment_id, photo_path) FROM stdin;
\.


--
-- TOC entry 3148 (class 0 OID 25097)
-- Dependencies: 215
-- Data for Name: rent_collections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rent_collections (id, listing_id, user_id, amount, payment_method, payment_screenshot, collection_date, status, notes, created_at, updated_at) FROM stdin;
1	31	6	800.00	online	rent-31-1754639056232-558043483.png	2025-08-08 07:44:16.22	completed	\N	2025-08-08 13:14:16.240356	2025-08-08 13:14:16.240356
2	30	6	500.00	online	rent-30-1754639107796-596388611.png	2025-08-08 07:45:07.789	completed	\N	2025-08-08 13:15:07.841479	2025-08-08 13:15:07.841479
3	30	6	500.00	cash	\N	2025-08-08 07:45:11.761	completed	\N	2025-08-08 13:15:11.769663	2025-08-08 13:15:11.769663
4	31	6	800.00	online	rent-31-1754732408209-466816580.png	2025-08-09 09:40:08.197	completed	\N	2025-08-09 15:10:08.25385	2025-08-09 15:10:08.25385
5	31	6	800.00	online	rent-31-1754889081373-459902115.png	2025-08-11 05:11:21.36	completed	\N	2025-08-11 10:41:21.425908	2025-08-11 10:41:21.425908
6	31	6	800.00	online	rent-31-1754903225648-580716747.png	2025-08-11 09:07:05.605	completed	\N	2025-08-11 14:37:05.684622	2025-08-11 14:37:05.684622
7	31	6	800.00	cash	\N	2025-08-11 09:07:27.133	completed	\N	2025-08-11 14:37:27.177826	2025-08-11 14:37:27.177826
\.


--
-- TOC entry 3136 (class 0 OID 16455)
-- Dependencies: 203
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, user_type, created_at, updated_at, company_id, is_active) FROM stdin;
1	\N	sakshamtiwari157@gmail.com	$2b$10$FVrRmiUM.u5AE8iL316c..Vg4tl8ihmpDUwzfF/F1H0zj0If2RmUy	3	2025-07-26 13:50:28.003582+05:30	2025-07-26 13:50:28.003582+05:30	60418013-8738-45bd-a5d4-2154ec9376be	t
2	\N	sa12@gmai	$2b$10$DZKYiYEg/..J6oFsAnmu5.4pPgGFfkOt/eDFUdoP9LiUIba3flm22	3	2025-07-26 13:50:28.003582+05:30	2025-07-26 13:50:28.003582+05:30	5314fe63-72bb-4a88-ad32-2c61c4f7724b	t
3	\N	saksham@gmail.com	$2b$10$WoLhQPPqdL4bJqgeUmmTJ.XBvYR5ek9kfZ0dJV8BZNqf/JlLVghjW	3	2025-07-26 13:50:28.003582+05:30	2025-07-26 13:50:28.003582+05:30	bf19df04-5d8b-457b-9bc8-0559035cfc5f	t
4	anila	anila@gmail.com	$2b$10$Esr/b52BzkIgZpapKYSp5er8Y8jmQriKi2FEqsjAxja1kXbjlHIXO	3	2025-07-26 13:50:28.003582+05:30	2025-07-26 13:50:28.003582+05:30	52940e54-0519-430d-bf7f-12d1d34d8559	t
5	john	john@gmail.com	$2b$10$WXGqnzXsXakgiyvUl0CeRO10QV.hRoDUnQy3WSVmLay7scoaKn9ye	3	2025-07-26 13:50:28.003582+05:30	2025-07-26 13:50:28.003582+05:30	ac72c5da-9df0-40c8-a3cd-b7c559d70c58	t
6	abcd	abcd@gmail.com	$2b$10$GLUc.v5kUFOsYDh7vGSOEed51vJrgDENkXmM/6uvcN614GdjbS7Jm	3	2025-07-26 13:50:28.003582+05:30	2025-07-26 13:50:28.003582+05:30	3a2182e8-4b1b-4d20-9d55-460ac34260c6	t
7	jkl	jkl@gmail.com	$2b$10$JNzajr0tpzyXddgvfCZJ.OBDbRKps0D2Ghy26n24XyZLVnnNwzLxG	3	2025-07-26 13:50:28.003582+05:30	2025-07-26 13:50:28.003582+05:30	cbed10e2-4d4a-4632-ad88-d3156ca83df8	t
8	abcde	abcde@gmail.com	$2b$10$DLy0ZeR/2Y4AL8.nTdtFq.FanXH0T7mtZIDs3aKhTN8DTLuL5qI2y	3	2025-07-26 14:20:12.20468+05:30	2025-07-26 14:20:12.20468+05:30	8e689643-5b29-4a9e-a1bd-99bc12b4971f	t
9	sad	companysad@gmail.com	$2b$10$iZ7QDVdV7ODRI.U97wrG0uRHtJJm4qjsithwNRUgYGCj54AamjFJW	3	2025-07-28 16:21:11.09811+05:30	2025-07-28 16:21:11.09811+05:30	\N	t
10	dsa	company_d@gmail.com	$2b$10$radAScs.Fk3.wYZYwlgTZe5dGKsHFWsbkTJRxmqXMlzEDVHF/XTHu	3	2025-07-28 16:26:16.571117+05:30	2025-07-28 16:31:11.284862+05:30	\N	t
11	Hi	company@example.com	$2b$10$F/5V.FJq/KhoOimNpCH76.daX4HL0I9JJ1jDydBN9esYGEH2XmyZe	3	2025-07-28 16:41:04.11747+05:30	2025-07-28 16:41:04.11747+05:30	\N	t
12	Saksham Admin	admin@company.com	$2b$10$L2aCqVsqGzMw1AV2pKvTzeOKKUmBAN2QtBHDYiEoEHEjDIJ/PDT0q	3	2025-07-28 16:44:35.83091+05:30	2025-07-28 16:44:35.83091+05:30	\N	t
13	harsh	employee@stack.com	$2b$10$2wL0CjB32VRI1QbCLmnuFeHDL64z0XSO8a7P0w0a2vTWqDFOuVq3a	3	2025-07-28 16:48:44.73471+05:30	2025-07-28 16:48:44.73471+05:30	\N	t
14	Admin	admin@acme.com	$2b$10$no.XmHqEi.fycOJAXKA3BOLd7zqfqfP2vfHkiDXjmyvV5uH9Q4l.2	3	2025-07-28 16:57:02.935346+05:30	2025-07-28 16:57:02.935346+05:30	\N	t
15	john	employee@acme.com	$2b$10$lRmdSLgAOdwEZAUIN.IjV.pulHICZA8kAQiGA4WrdHtNVjIun.twO	3	2025-07-28 16:57:27.3883+05:30	2025-07-28 16:57:27.3883+05:30	\N	t
16	Admin	admin@acmee.com	$2b$10$crk9XD2wQFa/xF5bve9mY./nvriNYcWfk8UFZcm0hsIgORKSJcoeG	1	2025-07-28 17:12:26.510708+05:30	2025-07-28 17:12:26.510708+05:30	1ce16035-53be-4af1-9b71-3ae86bceeea8	t
20	elly	elly@acmee.com	$2b$10$whUx619/1rELlujUKeegae8ZUJCW9SBBiAvhPmdXNU9VTPOqhIfGe	3	2025-07-28 17:14:25.883891+05:30	2025-07-28 17:14:25.883891+05:30	\N	t
21	admin1	admin@testcompany.com	$2b$10$E/oXEUr2q/C5ZTFmDPQ9peej8QgmcwawW52oFvhS9nmUiXMYnrSZy	1	2025-07-28 17:22:50.927686+05:30	2025-07-28 17:22:50.927686+05:30	1ffd7551-8097-4c7d-8f03-667ba16470fd	t
\.


--
-- TOC entry 3164 (class 0 OID 0)
-- Dependencies: 210
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appointments_id_seq', 28, true);


--
-- TOC entry 3165 (class 0 OID 0)
-- Dependencies: 208
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employees_id_seq', 3, true);


--
-- TOC entry 3166 (class 0 OID 0)
-- Dependencies: 204
-- Name: grouped_listings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.grouped_listings_id_seq', 19, true);


--
-- TOC entry 3167 (class 0 OID 0)
-- Dependencies: 206
-- Name: listings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.listings_id_seq', 31, true);


--
-- TOC entry 3168 (class 0 OID 0)
-- Dependencies: 212
-- Name: property_photos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.property_photos_id_seq', 1, false);


--
-- TOC entry 3169 (class 0 OID 0)
-- Dependencies: 214
-- Name: rent_collections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rent_collections_id_seq', 7, true);


--
-- TOC entry 3170 (class 0 OID 0)
-- Dependencies: 202
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 24, true);


--
-- TOC entry 2984 (class 2606 OID 16799)
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- TOC entry 2977 (class 2606 OID 16705)
-- Name: employees employees_email_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_id_key UNIQUE (email_id);


--
-- TOC entry 2979 (class 2606 OID 16703)
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- TOC entry 2973 (class 2606 OID 16549)
-- Name: grouped_listings grouped_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grouped_listings
    ADD CONSTRAINT grouped_listings_pkey PRIMARY KEY (id);


--
-- TOC entry 2975 (class 2606 OID 16567)
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- TOC entry 2987 (class 2606 OID 25077)
-- Name: property_photos property_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_photos
    ADD CONSTRAINT property_photos_pkey PRIMARY KEY (id);


--
-- TOC entry 2992 (class 2606 OID 25111)
-- Name: rent_collections rent_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_collections
    ADD CONSTRAINT rent_collections_pkey PRIMARY KEY (id);


--
-- TOC entry 2967 (class 2606 OID 16637)
-- Name: users unique_company_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_company_id UNIQUE (company_id);


--
-- TOC entry 2969 (class 2606 OID 16462)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 2971 (class 2606 OID 16460)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 2985 (class 1259 OID 16817)
-- Name: idx_appointments_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_company_id ON public.appointments USING btree (company_id);


--
-- TOC entry 2980 (class 1259 OID 16809)
-- Name: idx_employees_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_company_id ON public.employees USING btree (company_id);


--
-- TOC entry 2981 (class 1259 OID 16813)
-- Name: idx_employees_email_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_email_company ON public.employees USING btree (email_id, company_id);


--
-- TOC entry 2982 (class 1259 OID 16812)
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_status ON public.employees USING btree (status);


--
-- TOC entry 2988 (class 1259 OID 25124)
-- Name: idx_rent_collections_collection_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rent_collections_collection_date ON public.rent_collections USING btree (collection_date);


--
-- TOC entry 2989 (class 1259 OID 25122)
-- Name: idx_rent_collections_listing_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rent_collections_listing_id ON public.rent_collections USING btree (listing_id);


--
-- TOC entry 2990 (class 1259 OID 25123)
-- Name: idx_rent_collections_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rent_collections_user_id ON public.rent_collections USING btree (user_id);


--
-- TOC entry 2964 (class 1259 OID 16810)
-- Name: idx_users_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_company_id ON public.users USING btree (company_id);


--
-- TOC entry 2965 (class 1259 OID 16811)
-- Name: idx_users_user_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_user_type ON public.users USING btree (user_type);


--
-- TOC entry 3002 (class 2620 OID 16575)
-- Name: listings trigger_listings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 2999 (class 2620 OID 16576)
-- Name: users trigger_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3004 (class 2620 OID 16824)
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3001 (class 2620 OID 16825)
-- Name: grouped_listings update_grouped_listings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_grouped_listings_updated_at BEFORE UPDATE ON public.grouped_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3003 (class 2620 OID 16823)
-- Name: listings update_listings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3000 (class 2620 OID 16822)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 2995 (class 2606 OID 16800)
-- Name: appointments appointments_assigned_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_assigned_employee_id_fkey FOREIGN KEY (assigned_employee_id) REFERENCES public.employees(id);


--
-- TOC entry 2993 (class 2606 OID 16550)
-- Name: grouped_listings grouped_listings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grouped_listings
    ADD CONSTRAINT grouped_listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 2994 (class 2606 OID 25089)
-- Name: listings listings_booked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_booked_by_fkey FOREIGN KEY (booked_by) REFERENCES public.employees(id);


--
-- TOC entry 2996 (class 2606 OID 25078)
-- Name: property_photos property_photos_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_photos
    ADD CONSTRAINT property_photos_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- TOC entry 2997 (class 2606 OID 25112)
-- Name: rent_collections rent_collections_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_collections
    ADD CONSTRAINT rent_collections_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id);


--
-- TOC entry 2998 (class 2606 OID 25117)
-- Name: rent_collections rent_collections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rent_collections
    ADD CONSTRAINT rent_collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3154 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2025-08-11 16:58:13

--
-- PostgreSQL database dump complete
--

